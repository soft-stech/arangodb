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
/// @author Tobias Goedderz
/// @author Michael Hackstein
/// @author Heiko Kernbach
/// @author Jan Christoph Uhde
////////////////////////////////////////////////////////////////////////////////

#pragma once

#include "Aql/DocumentProducingHelper.h"
#include "Aql/ExecutionState.h"
#include "Aql/InputAqlItemRow.h"
#include "Aql/RegisterInfos.h"
#include "Transaction/Methods.h"

#include <memory>
#include <string>
#include <vector>

namespace arangodb {
class IndexIterator;
struct ResourceMonitor;

namespace transaction {
class Methods;
}
namespace aql {

struct AqlCall;
class AqlItemBlockInputRange;
struct Collection;
class EnumerateCollectionStats;
class ExecutionEngine;
class RegisterInfos;
class Expression;
class InputAqlItemRow;
class OutputAqlItemRow;
class Projections;
class QueryContext;
struct Variable;

template<BlockPassthrough>
class SingleRowFetcher;

class EnumerateCollectionExecutorInfos {
 public:
  EnumerateCollectionExecutorInfos(
      RegisterId outputRegister, aql::QueryContext& query,
      Collection const* collection, Variable const* outVariable,
      bool produceResult, Expression* filter,
      arangodb::aql::Projections projections,
      std::vector<std::pair<VariableId, RegisterId>> filterVarsToRegs,
      bool random, bool count, ReadOwnWrites readOwnWrites);

  EnumerateCollectionExecutorInfos() = delete;
  EnumerateCollectionExecutorInfos(EnumerateCollectionExecutorInfos&&) =
      default;
  EnumerateCollectionExecutorInfos(EnumerateCollectionExecutorInfos const&) =
      delete;
  ~EnumerateCollectionExecutorInfos() = default;

  Collection const* getCollection() const;
  Variable const* getOutVariable() const;
  QueryContext& getQuery() const;
  Expression* getFilter() const noexcept;
  ResourceMonitor& getResourceMonitor() noexcept;
  arangodb::aql::Projections const& getProjections() const noexcept;
  arangodb::aql::Projections const& getFilterProjections() const noexcept;
  bool getProduceResult() const noexcept;
  bool getRandom() const noexcept;
  bool getCount() const noexcept;
  RegisterId getOutputRegisterId() const;

  std::vector<std::pair<VariableId, RegisterId>> const&
  getFilterVarsToRegister() const noexcept;

  ReadOwnWrites canReadOwnWrites() const noexcept { return _readOwnWrites; }

 private:
  aql::QueryContext& _query;
  Collection const* _collection;
  Variable const* _outVariable;
  Expression* _filter;
  arangodb::aql::Projections _projections;
  arangodb::aql::Projections _filterProjections;
  RegisterId _outputRegisterId;
  std::vector<std::pair<VariableId, RegisterId>> _filterVarsToRegs;
  bool const _produceResult;
  bool const _random;
  bool const _count;
  ReadOwnWrites const _readOwnWrites;
};

/**
 * @brief Implementation of EnumerateCollection Node
 */
class EnumerateCollectionExecutor {
 public:
  struct Properties {
    static constexpr bool preservesOrder = true;
    static constexpr BlockPassthrough allowsBlockPassthrough =
        BlockPassthrough::Disable;
  };
  using Fetcher = SingleRowFetcher<Properties::allowsBlockPassthrough>;
  using Infos = EnumerateCollectionExecutorInfos;
  using Stats = EnumerateCollectionStats;

  EnumerateCollectionExecutor() = delete;
  EnumerateCollectionExecutor(EnumerateCollectionExecutor&&) = delete;
  EnumerateCollectionExecutor(EnumerateCollectionExecutor const&) = delete;
  EnumerateCollectionExecutor(Fetcher& fetcher, Infos&);
  ~EnumerateCollectionExecutor();

  /**
   * @brief Will fetch a new InputRow if necessary and store their local state
   *
   * @return bool done in case we do not have any input and upstreamState is
   * done
   */
  void initializeNewRow(AqlItemBlockInputRange& inputRange);

  /**
   * @brief This Executor in some cases knows how many rows it will produce and
   * most by itself
   */
  [[nodiscard]] auto expectedNumberOfRows(AqlItemBlockInputRange const& input,
                                          AqlCall const& call) const noexcept
      -> size_t;

  /**
   * @brief produce the next Rows of Aql Values.
   *
   * @return ExecutorState, the stats, and a new Call that needs to be send to
   * upstream
   */
  [[nodiscard]] std::tuple<ExecutorState, Stats, AqlCall> produceRows(
      AqlItemBlockInputRange& input, OutputAqlItemRow& output);

  uint64_t skipEntries(size_t toSkip, EnumerateCollectionStats& stats);
  /**
   * @brief skip the next Row of Aql Values.
   *
   * @return ExecutorState, the stats, and a new Call that needs to be send to
   * upstream
   */
  [[nodiscard]] std::tuple<ExecutorState, Stats, size_t, AqlCall> skipRowsRange(
      AqlItemBlockInputRange& inputRange, AqlCall& call);

  void initializeCursor();

 private:
  transaction::Methods _trx;
  Infos& _infos;
  IndexIterator::LocalDocumentIdCallback _documentNonProducer;
  IndexIterator::DocumentCallback _documentProducer;
  IndexIterator::DocumentCallback _documentSkipper;
  DocumentProducingFunctionContext _documentProducingFunctionContext;
  ExecutionState _state;
  ExecutorState _executorState;
  bool _cursorHasMore;
  InputAqlItemRow _currentRow;
  std::unique_ptr<IndexIterator> _cursor;
};

}  // namespace aql
}  // namespace arangodb
