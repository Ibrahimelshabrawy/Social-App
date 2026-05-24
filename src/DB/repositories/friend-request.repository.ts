import BaseRepository from "./base.repository";

import FriendRequestModel, {
  IFriendRequest,
} from "../../DB/models/friend-request.model";

class FriendRequestRepository extends BaseRepository<IFriendRequest> {
  constructor() {
    super(FriendRequestModel);
  }
}

export default FriendRequestRepository;
