import { TrackType } from '../context/OnboardingContext';
import { OnboardingRouteName } from './onboardingTypes';

export function getNextOnboardingRoute(
  current: OnboardingRouteName,
  tracks: TrackType[],
): OnboardingRouteName | null {
  const tracksGym = tracks.includes('gym');
  const tracksStudy = tracks.includes('study');

  switch (current) {
    case 'Welcome':
      return 'TrackSelection';
    case 'TrackSelection':
      return 'Semester';
    case 'Semester':
      if (tracksStudy) return 'StudySetup';
      if (tracksGym) return 'GymSetup';
      return 'Finish';
    case 'StudySetup':
      if (tracksGym) return 'GymSetup';
      return 'Finish';
    case 'GymSetup':
      return 'Finish';
    case 'Finish':
      return null;
    default:
      return null;
  }
}
