export type OnboardingStackParamList = {
  Welcome: undefined;
  TrackSelection: undefined;
  GymSetup: undefined;
  StudyLoad: undefined;
  StudySessions: undefined;
  CourseNames: undefined;
  Finish: undefined;
};

export type OnboardingRouteName = keyof OnboardingStackParamList;
