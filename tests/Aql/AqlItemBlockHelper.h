////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2014-2020 ArangoDB GmbH, Cologne, Germany
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
/// @author Tobias Gödderz
////////////////////////////////////////////////////////////////////////////////

#pragma once

#include <array>
#include <memory>
#include <variant>

#include "Aql/AqlItemBlock.h"
#include "Aql/SharedAqlItemBlockPtr.h"
#include "Basics/ResourceUsage.h"
#include "Basics/overload.h"

#include "AqlHelper.h"
#include "VelocyPackHelper.h"

#include <velocypack/Slice.h>

/* * * * * * * *
 * * SYNOPSIS  *
 * * * * * * * *

build a matrix with 4 rows and 3 columns
the number of columns has to be specified as a template parameter:

  SharedAqlItemBlockPtr block = buildBlock<3>({
    { {1}, {2}, {R"({ "iam": [ "a", "json" ] })"} },
    { {4}, {5}, {"\"and will be converted\""} },
    { {7}, {8}, {R"({ "into": [], "a": [], "vpack": [] })"} },
    { {10}, {11}, {12} },
  });

Currently supported types for values are `int` and `const char*`.

Also, print the block like this:

  std::cout << *block;

1, 2, {"iam":["a","json"]}
4, 5, "and will be converted"
7, 8, {"a":[],"into":[],"vpack":[]}
10, 11, 12

  Optionally you can now add a vector<pair<rowIndex, depth>>
  To create shadow rows on the given AqlItemBlock e.g.

    SharedAqlItemBlockPtr block = buildBlock<3>({
    { {1}, {2}, {R"({ "iam": [ "a", "json" ] })"} },
    { {4}, {5}, {"\"and will be converted\""} },
    { {7}, {8}, {R"({ "into": [], "a": [], "vpack": [] })"} },
    { {10}, {11}, {12} },
  }, {{1,0},{2,1}});

  would create a shadowrow on index 1 with depth 0 and a shadowrow of index 2
with depth 1
 */

namespace arangodb {
namespace tests {
namespace aql {

struct NoneEntry {};

using EntryBuilder = std::variant<NoneEntry, int, const char*>;

template<::arangodb::aql::RegisterId::value_t columns>
using RowBuilder = std::array<EntryBuilder, columns>;

template<::arangodb::aql::RegisterId::value_t columns>
using MatrixBuilder = std::vector<RowBuilder<columns>>;

template<::arangodb::aql::RegisterId::value_t columns>
::arangodb::aql::SharedAqlItemBlockPtr buildBlock(
    ::arangodb::aql::AqlItemBlockManager& manager,
    MatrixBuilder<columns>&& matrix,
    std::vector<std::pair<size_t, uint64_t>> const& shadowRows = {});

}  // namespace aql
}  // namespace tests
}  // namespace arangodb

namespace arangodb {
namespace tests {
namespace aql {

using namespace ::arangodb::aql;

template<RegisterId::value_t columns>
SharedAqlItemBlockPtr buildBlock(
    AqlItemBlockManager& manager, MatrixBuilder<columns>&& matrix,
    std::vector<std::pair<size_t, uint64_t>> const& shadowRows) {
  if (matrix.size() == 0) {
    return nullptr;
  }
  SharedAqlItemBlockPtr block{
      new AqlItemBlock(manager, matrix.size(), columns)};

  if constexpr (columns > 0) {
    for (size_t row = 0; row < matrix.size(); row++) {
      for (RegisterId::value_t col = 0; col < columns; col++) {
        auto const& entry = matrix[row][col];
        auto value = std::visit(
            overload{
                [](NoneEntry) { return AqlValue{}; },
                [](int i) { return AqlValue{AqlValueHintInt{i}}; },
                [](const char* json) {
                  VPackBufferPtr tmpVpack = vpackFromJsonString(json);
                  return AqlValue{
                      AqlValueHintSliceCopy{VPackSlice(tmpVpack->data())}};
                },
            },
            entry);
        block->setValue(row, col, value);
      }
    }
  }

  for (auto const& it : shadowRows) {
    block->makeShadowRow(it.first, it.second);
  }

  return block;
}

}  // namespace aql
}  // namespace tests
}  // namespace arangodb
