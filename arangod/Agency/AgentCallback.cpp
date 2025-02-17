////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2014-2023 ArangoDB GmbH, Cologne, Germany
/// Copyright 2004-2014 triAGENS GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is ArangoDB GmbH, Cologne, Germany
///
/// @author Kaveh Vahedipour
////////////////////////////////////////////////////////////////////////////////

#include "AgentCallback.h"

#include "Agency/Agent.h"
#include "ApplicationFeatures/ApplicationServer.h"
#include "Logger/LogMacros.h"
#include "Network/Methods.h"
#include "Basics/system-functions.h"

using namespace arangodb::application_features;
using namespace arangodb::consensus;
using namespace arangodb::velocypack;

AgentCallback::AgentCallback()
    : _agent(nullptr), _last(0), _toLog(0), _startTime(0.0) {}

AgentCallback::AgentCallback(Agent* agent, std::string followerId, index_t last,
                             size_t toLog)
    : _agent(agent),
      _last(last),
      _followerId(std::move(followerId)),
      _toLog(toLog),
      _startTime(TRI_microtime()) {
  TRI_ASSERT(_agent != nullptr);
}

bool AgentCallback::operator()(arangodb::network::Response const& r) const {
  if (r.ok()) {
    auto body = r.slice();
    bool success = false;
    term_t otherTerm = 0;

    if (body.hasKey("success") && body.get("success").isBoolean() &&
        body.hasKey("term") && body.get("term").isNumber()) {
      success = body.get("success").isTrue();
      otherTerm = body.get("term").getNumber<term_t>();
    } else {
      LOG_TOPIC("1b7bb", DEBUG, Logger::AGENCY)
          << "Bad callback message received: " << body.toJson();
      _agent->reportFailed(_followerId, _toLog);
      return true;
    }

    if (otherTerm > _agent->term()) {
      _agent->resign(otherTerm);
    } else if (!success) {
      LOG_TOPIC("7cbce", DEBUG, Logger::CLUSTER)
          << "Got negative answer from follower, will retry later.";
      // This reportFailed will reset _confirmed in Agent for this follower
      _agent->reportFailed(_followerId, _toLog, true);
    } else {
      Slice senderTimeStamp = body.get("senderTimeStamp");
      if (senderTimeStamp.isInteger()) {
        try {
          int64_t sts = senderTimeStamp.getNumber<int64_t>();
          int64_t now = std::llround(steadyClockToDouble() * 1000);
          if (now - sts > 1000) {  // a second round trip time!
            LOG_TOPIC("c2aac", DEBUG, Logger::AGENCY)
                << "Round trip for appendEntriesRPC took " << now - sts
                << " milliseconds, which is way too high!";
          }
        } catch (...) {
          LOG_TOPIC("b1549", WARN, Logger::AGENCY)
              << "Exception when looking at senderTimeStamp in "
                 "appendEntriesRPC"
                 " answer.";
        }
      }

      LOG_TOPIC("0bfa4", DEBUG, Logger::AGENCY)
          << "AgentCallback: " << body.toJson();
      _agent->reportIn(_followerId, _last, _toLog);
    }

    LOG_TOPIC("8b0d8", DEBUG, Logger::AGENCY)
        << "Got good callback from AppendEntriesRPC: "
        << "comm_status(" << fuerte::to_string(r.error) << "), last(" << _last
        << "), follower(" << _followerId << "), time("
        << TRI_microtime() - _startTime << ")";
  } else {
    if (!_agent->isStopping()) {
      // Do not warn if we are already shutting down:
      LOG_TOPIC("2c712", WARN, Logger::AGENCY)
          << "Got bad callback from AppendEntriesRPC: "
          << "comm_status(" << fuerte::to_string(r.error) << "), last(" << _last
          << "), follower(" << _followerId << "), time("
          << TRI_microtime() - _startTime << ")";
    }
    _agent->reportFailed(_followerId, _toLog);
  }
  return true;
}
