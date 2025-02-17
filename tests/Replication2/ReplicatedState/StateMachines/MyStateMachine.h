////////////////////////////////////////////////////////////////////////////////
/// DISCLAIMER
///
/// Copyright 2021-2021 ArangoDB GmbH, Cologne, Germany
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
/// @author Lars Maier
////////////////////////////////////////////////////////////////////////////////

#pragma once
#include <string>
#include <unordered_map>

#include "Replication2/ReplicatedState/ReplicatedState.h"
#include "Replication2/ReplicatedState/StateInterfaces.h"

namespace arangodb::replication2::test {

struct MyFactory;
struct MyEntryType;
struct MyLeaderState;
struct MyFollowerState;
struct MyCoreType;

struct MyState {
  using LeaderType = MyLeaderState;
  using FollowerType = MyFollowerState;
  using EntryType = MyEntryType;
  using FactoryType = MyFactory;
  using CoreType = MyCoreType;
  using CoreParameterType = void;
  using CleanupHandlerType = void;
};

struct MyEntryType {
  std::string key, value;
};

struct MyStateBase {
  virtual ~MyStateBase() = default;
  std::unordered_map<std::string, std::string> store;

  void applyIterator(
      TypedLogRangeIterator<streams::StreamEntryView<MyEntryType>>& iter);
};

struct MyLeaderState : MyStateBase,
                       replicated_state::IReplicatedLeaderState<MyState> {
  explicit MyLeaderState(std::unique_ptr<MyCoreType> core)
      : _core(std::move(core)) {}
  void set(std::string key, std::string value);
  [[nodiscard]] auto wasRecoveryRun() const noexcept -> bool {
    return recoveryRan;
  }

  [[nodiscard]] auto resign() && noexcept
      -> std::unique_ptr<MyCoreType> override;

 protected:
  auto recoverEntries(std::unique_ptr<EntryIterator> ptr)
      -> futures::Future<Result> override;

  bool recoveryRan = false;

  std::unique_ptr<MyCoreType> _core;
};

struct MyFollowerState : MyStateBase,
                         replicated_state::IReplicatedFollowerState<MyState> {
  explicit MyFollowerState(std::unique_ptr<MyCoreType> core)
      : _core(std::move(core)) {}
  [[nodiscard]] auto resign() && noexcept
      -> std::unique_ptr<MyCoreType> override;

 protected:
  auto acquireSnapshot(ParticipantId const& destination, LogIndex) noexcept
      -> futures::Future<Result> override;
  auto applyEntries(std::unique_ptr<EntryIterator> ptr) noexcept
      -> futures::Future<Result> override;

  std::unique_ptr<MyCoreType> _core;
};

struct MyFactory {
  auto constructFollower(std::unique_ptr<MyCoreType>,
                         std::shared_ptr<IScheduler> scheduler)
      -> std::shared_ptr<MyFollowerState>;
  auto constructLeader(std::unique_ptr<MyCoreType>)
      -> std::shared_ptr<MyLeaderState>;
  auto constructCore(TRI_vocbase_t&, GlobalLogIdentifier const&)
      -> std::unique_ptr<MyCoreType>;
};

struct MyCoreType {};

}  // namespace arangodb::replication2::test

namespace arangodb::replication2 {
template<>
struct replicated_state::EntryDeserializer<test::MyEntryType> {
  auto operator()(streams::serializer_tag_t<test::MyEntryType>,
                  velocypack::Slice s) const -> test::MyEntryType;
};

template<>
struct replicated_state::EntrySerializer<test::MyEntryType> {
  void operator()(streams::serializer_tag_t<test::MyEntryType>,
                  test::MyEntryType const& e, velocypack::Builder& b) const;
};
}  // namespace arangodb::replication2
