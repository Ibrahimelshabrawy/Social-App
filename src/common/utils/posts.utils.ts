import {Request} from "express";
import {AvailabilityEnum} from "../enum/post.enum";

export const AvailabilityPost = (req: Request) => {
  return {
    $or: [
      {availability: AvailabilityEnum.public},
      {availability: AvailabilityEnum.onlyMe, createdBy: req.user._id},
      {
        availability: AvailabilityEnum.friends,
        createdBy: {$in: [...(req.user.friends || []), req.user?._id]},
      },
      {tags: {$in: [req.user?._id]}},
    ],
  };
};
