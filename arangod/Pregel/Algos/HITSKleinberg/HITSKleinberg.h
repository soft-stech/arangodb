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
/// @author Roman Rabinovich
////////////////////////////////////////////////////////////////////////////////

#pragma once

#include "Pregel/Algorithm.h"
#include "Pregel/Algos/HITSKleinberg/HITSKleinbergValue.h"
#include "Pregel/SenderMessage.h"
#include "Pregel/SenderMessageFormat.h"

/// The version of the algorithm according to
/// J. Kleinberg, Authoritative sources in a hyperlinked environment,
/// Journal of the ACM. 46 (5): 604–632, 1999,
/// http://www.cs.cornell.edu/home/kleinber/auth.pdf.

namespace arangodb::pregel::algos {

struct HITSKleinbergType {
  using Vertex = HITSKleinbergValue;
  using Edge = int8_t;
  using Message = SenderMessage<double>;
};

struct HITSKleinberg : public SimpleAlgorithm<HITSKleinbergValue, int8_t,
                                              SenderMessage<double>> {
 public:
  HITSKleinberg(VPackSlice userParams)
      : SimpleAlgorithm<HITSKleinbergValue, int8_t, SenderMessage<double>>(
            userParams) {
    if (userParams.hasKey(Utils::maxNumIterations)) {
      numIterations = userParams.get(Utils::maxNumIterations).getInt();
    }
    if (userParams.hasKey(Utils::maxGSS)) {
      maxGSS = userParams.get(Utils::maxGSS).getInt();
    }
  }

  [[nodiscard]] auto name() const -> std::string_view override {
    return "HITSKleinberg";
  };

  [[nodiscard]] std::shared_ptr<GraphFormat<HITSKleinbergValue, int8_t> const>
  inputFormat() const override;
  [[nodiscard]] MessageFormat<SenderMessage<double>>* messageFormat()
      const override {
    return new SenderMessageFormat<double>();
  }
  [[nodiscard]] auto messageFormatUnique() const
      -> std::unique_ptr<message_format> override {
    return std::make_unique<SenderMessageFormat<double>>();
  }

  VertexComputation<HITSKleinbergValue, int8_t, SenderMessage<double>>*
      createComputation(std::shared_ptr<WorkerConfig const>) const override;

  [[nodiscard]] auto workerContext(
      std::unique_ptr<AggregatorHandler> readAggregators,
      std::unique_ptr<AggregatorHandler> writeAggregators,
      velocypack::Slice userParams) const -> WorkerContext* override;
  [[nodiscard]] auto workerContextUnique(
      std::unique_ptr<AggregatorHandler> readAggregators,
      std::unique_ptr<AggregatorHandler> writeAggregators,
      velocypack::Slice userParams) const
      -> std::unique_ptr<WorkerContext> override;

  [[nodiscard]] auto masterContext(
      std::unique_ptr<AggregatorHandler> aggregators,
      arangodb::velocypack::Slice userParams) const -> MasterContext* override;
  [[nodiscard]] auto masterContextUnique(
      uint64_t vertexCount, uint64_t edgeCount,
      std::unique_ptr<AggregatorHandler> aggregators,
      arangodb::velocypack::Slice userParams) const
      -> std::unique_ptr<MasterContext> override;

  [[nodiscard]] IAggregator* aggregator(std::string const& name) const override;

  size_t numIterations = 0;
  size_t maxGSS = 0;
};
}  // namespace arangodb::pregel::algos
