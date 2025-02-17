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
/// @author Michael Hackstein
////////////////////////////////////////////////////////////////////////////////

#include "ClusterTraverserCache.h"

#include "Aql/AqlValue.h"
#include "Aql/Query.h"
#include "Basics/ResourceUsage.h"
#include "Basics/VelocyPackHelper.h"
#include "Cluster/ServerState.h"
#include "Graph/BaseOptions.h"
#include "Graph/EdgeDocumentToken.h"
#include "Transaction/Methods.h"

#include <velocypack/Builder.h>
#include <velocypack/HashedStringRef.h>
#include <velocypack/Slice.h>

using namespace arangodb;
using namespace arangodb::basics;
using namespace arangodb::graph;

ClusterTraverserCache::ClusterTraverserCache(
    aql::QueryContext& query,
    std::unordered_map<ServerID, aql::EngineId> const* engines,
    BaseOptions* options)
    : TraverserCache(query, options),
      _datalake(options->resourceMonitor()),
      _engines(engines) {}

VPackSlice ClusterTraverserCache::lookupToken(EdgeDocumentToken const& token) {
  return VPackSlice(token.vpack());
}

aql::AqlValue ClusterTraverserCache::fetchEdgeAqlResult(
    EdgeDocumentToken const& token) {
  // FIXME: the ClusterTraverserCache lifetime is shorter than the query
  // lifetime therefore we cannot get away here without copying the result
  return aql::AqlValue(VPackSlice(token.vpack()));  // will copy slice
}

void ClusterTraverserCache::insertEdgeIntoResult(EdgeDocumentToken const& token,
                                                 VPackBuilder& result) {
  result.add(VPackSlice(token.vpack()));
}
