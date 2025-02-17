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
/// @author Jan Steemann
////////////////////////////////////////////////////////////////////////////////

#include "Aql/Function.h"
#include "Aql/Functions.h"
#include "Basics/Exceptions.h"
#include "Logger/LogMacros.h"
#include "Logger/Logger.h"
#include "Logger/LoggerStream.h"

#include <velocypack/Builder.h>
#include <velocypack/Value.h>
#include <velocypack/ValueType.h>

using namespace arangodb::aql;

/// @brief create the function
Function::Function(std::string const& name, char const* arguments,
                   std::underlying_type<Flags>::type flags,
                   FunctionImplementation implementation)
    : name(name),
      arguments(arguments),
      flags(flags),
      implementation(implementation),
      conversions() {
  initializeArguments();

  // almost all AQL functions have a cxx implementation, only function V8() does
  // not have one.
  LOG_TOPIC("c70f6", TRACE, Logger::AQL)
      << "registered AQL function '" << name
      << "'. cacheable: " << hasFlag(Flags::Cacheable)
      << ", deterministic: " << hasFlag(Flags::Deterministic)
      << ", canRunOnDBServerCluster: "
      << hasFlag(Flags::CanRunOnDBServerCluster)
      << ", canRunOnDBServerOneShard: "
      << hasFlag(Flags::CanRunOnDBServerOneShard)
      << ", canReadDocuments: " << hasFlag(Flags::CanReadDocuments)
      << ", canUseInAnalyzer: " << hasFlag(Flags::CanUseInAnalyzer)
      << ", internal: " << hasFlag(Flags::Internal)
      << ", hasCxxImplementation: " << hasCxxImplementation()
      << ", hasConversions: " << !conversions.empty();

  // currently being able to run on a DB server in cluster always includes being
  // able to run on a DB server in OneShard mode. this may change at some point
  // in the future.
  TRI_ASSERT(!hasFlag(Flags::CanRunOnDBServerCluster) ||
             hasFlag(Flags::CanRunOnDBServerOneShard));

  // functions that read documents are not usable in analyzers.
  TRI_ASSERT(!hasFlag(Flags::CanReadDocuments) ||
             !hasFlag(Flags::CanUseInAnalyzer));

  // only the V8 function does not have a C++ implementation.
  // don't ever change this!
  // note: CUSTOMSCORER and INVALID are only used by unit tests
  TRI_ASSERT(hasCxxImplementation() || name == "V8" || name == "CUSTOMSCORER" ||
             name == "INVALID")
      << "unexpected AQL function without C++ implementation: " << name;
}

#ifdef ARANGODB_USE_GOOGLE_TESTS
// constructor to create a function stub. only used from tests
Function::Function(std::string const& name,
                   FunctionImplementation implementation)
    : name(name),
      arguments("."),
      flags(makeFlags()),
      implementation(implementation) {
  initializeArguments();
}
#endif

/// @brief parse the argument list and set the minimum and maximum number of
/// arguments
void Function::initializeArguments() {
  minRequiredArguments = 0;
  maxRequiredArguments = 0;

  size_t position = 0;

  // setup some parsing state
  bool inOptional = false;
  bool foundArg = false;

  char const* p = arguments;
  while (true) {
    char const c = *p++;

    switch (c) {
      case '\0':
        // end of argument list
        if (foundArg) {
          if (!inOptional) {
            ++minRequiredArguments;
          }
          ++maxRequiredArguments;
        }
        return;

      case '|':
        // beginning of optional arguments
        ++position;
        TRI_ASSERT(!inOptional);
        if (foundArg) {
          ++minRequiredArguments;
          ++maxRequiredArguments;
        }
        inOptional = true;
        foundArg = false;
        break;

      case ',':
        // next argument
        ++position;
        TRI_ASSERT(foundArg);

        if (!inOptional) {
          ++minRequiredArguments;
        }
        ++maxRequiredArguments;
        foundArg = false;
        break;

      case '+':
        // repeated optional argument
        TRI_ASSERT(inOptional);
        maxRequiredArguments = maxArguments;
        return;

      case 'h':
        // we found a collection parameter

        // set the conversion info for the position
        if (conversions.size() <= position) {
          // we don't yet have another parameter at this position
          conversions.emplace_back(Conversion::Required);
        } else if (conversions[position] == Conversion::None) {
          // we already had a parameter at this position
          conversions[position] = Conversion::Optional;
        }
        foundArg = true;
        break;

      case '.':
        // we found any other parameter

        // set the conversion info for the position
        if (conversions.size() <= position) {
          // we don't yet have another parameter at this position
          conversions.emplace_back(Conversion::None);
        } else if (conversions[position] == Conversion::Required) {
          // we already had a parameter at this position
          conversions[position] = Conversion::Optional;
        }
        foundArg = true;
        break;

      default: {
        // unknown parameter type
        std::string message(
            "unknown function signature parameter type for AQL function '");
        message += name + "': " + c;
        THROW_ARANGO_EXCEPTION_MESSAGE(TRI_ERROR_INTERNAL, message);
      }
    }
  }
}

/// @brief whether or not the function is built using V8
bool Function::hasV8Implementation() const noexcept {
  return implementation == nullptr;
}

/// @brief whether or not the function is built using C++
bool Function::hasCxxImplementation() const noexcept {
  return implementation != nullptr;
}

bool Function::hasFlag(Function::Flags flag) const noexcept {
  return (flags & static_cast<std::underlying_type<Flags>::type>(flag)) != 0;
}

std::pair<size_t, size_t> Function::numArguments() const {
  return std::make_pair(minRequiredArguments, maxRequiredArguments);
}

Function::Conversion Function::getArgumentConversion(size_t position) const {
  if (position >= conversions.size()) {
    return Conversion::None;
  }
  return conversions[position];
}

void Function::toVelocyPack(arangodb::velocypack::Builder& builder) const {
  builder.openObject();
  builder.add("name", velocypack::Value(name));
  builder.add("arguments", velocypack::Value(arguments));
  builder.add("implementations",
              velocypack::Value(velocypack::ValueType::Array));
  if (hasV8Implementation()) {
    builder.add(velocypack::Value("js"));
  }
  if (hasCxxImplementation()) {
    builder.add(velocypack::Value("cxx"));
  }
  builder.close();  // implementations
  builder.add("deterministic",
              velocypack::Value(hasFlag(Flags::Deterministic)));
  builder.add("cacheable", velocypack::Value(hasFlag(Flags::Cacheable)));
  builder.add("canRunOnDBServerCluster",
              velocypack::Value(hasFlag(Flags::CanRunOnDBServerCluster)));
  builder.add("canRunOnDBServerOneShard",
              velocypack::Value(hasFlag(Flags::CanRunOnDBServerOneShard)));
  builder.add("canReadDocuments",
              velocypack::Value(hasFlag(Flags::CanReadDocuments)));
  builder.add("canUseInAnalyzer",
              velocypack::Value(hasFlag(Flags::CanUseInAnalyzer)));

  // deprecated: only here for compatibility
  builder.add("canRunOnDBServer",
              velocypack::Value(hasFlag(Flags::CanRunOnDBServerCluster)));

  builder.add("stub",
              velocypack::Value(implementation == &functions::NotImplemented));
  builder.close();
}
