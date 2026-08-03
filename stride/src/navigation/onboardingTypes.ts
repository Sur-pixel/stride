export type OnboardingStackParamList = {
  Welcome: undefined;
  TrackSelection: undefined;
  Semester: undefined;
  StudySetup: undefined;
  GymSetup: undefined;
  Finish: undefined;
};

export type OnboardingRouteName = keyof OnboardingStackParamList;
