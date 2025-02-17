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
/// @author Frank Celler
////////////////////////////////////////////////////////////////////////////////

#pragma once

#include "Maskings/RandomStringMask.h"

namespace arangodb::maskings {
class RandomMask : public RandomStringMask {
 public:
  static ParseResult<AttributeMasking> create(Path, Maskings*,
                                              velocypack::Slice def);

  explicit RandomMask(Maskings* maskings) : RandomStringMask(maskings) {}

  void mask(bool, velocypack::Builder& out, std::string& buffer) const override;
  void mask(int64_t, velocypack::Builder& out,
            std::string& buffer) const override;
  void mask(double, velocypack::Builder& out,
            std::string& buffer) const override;

  using RandomStringMask::mask;
};
}  // namespace arangodb::maskings
