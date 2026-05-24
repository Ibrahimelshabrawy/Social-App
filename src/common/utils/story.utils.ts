import {Request} from "express";

export const AvailabilityStory = (req: Request) => {
  return [
    {
      createdBy: req.user._id,
    },
    {
      createdBy: {
        $in: req.user.friends || [],
      },
    },
  ];
};
