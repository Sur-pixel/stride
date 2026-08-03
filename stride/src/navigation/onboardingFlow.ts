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
      if (tracksGym) return 'GymSetup';
      if (tracksStudy) return 'StudyLoad';
      return null;
    case 'GymSetup':
      if (tracksStudy) return 'StudyLoad';
      return 'Finish';
    case 'StudyLoad':
      return 'StudySessions';
    case 'StudySessions':
      return 'CourseNames';
    case 'CourseNames':
      return 'Finish';
    case 'Finish':
      return null;
    default:
      return null;
  }
}
