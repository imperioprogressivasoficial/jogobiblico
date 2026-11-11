import { GameCanvas } from './ui/GameCanvas';
import { Toasts } from './ui/components/common';
import { useScreen } from './ui/UIManager';
import { AchievementsScreen } from './ui/screens/AchievementsScreen';
import { CharacterSelect } from './ui/screens/CharacterSelect';
import { GameScreen } from './ui/screens/GameScreen';
import { MainMenu } from './ui/screens/MainMenu';
import { MapSelect } from './ui/screens/MapSelect';
import { JourneyScreen } from './ui/screens/JourneyScreen';
import { MissionsScreen } from './ui/screens/MissionsScreen';
import { RecordsScreen } from './ui/screens/RecordsScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { ShopScreen } from './ui/screens/ShopScreen';
import { SplashScreen } from './ui/screens/SplashScreen';
import { OnboardingScreen } from './ui/screens/OnboardingScreen';
import { ModesScreen } from './ui/screens/ModesScreen';
import { CoinsInfoScreen } from './ui/screens/CoinsInfoScreen';
import { ParentsScreen } from './ui/screens/ParentsScreen';
import { WorldScreen } from './ui/screens/WorldScreen';
import { QuizMode } from './ui/screens/modes/QuizMode';
import { MemoryMode } from './ui/screens/modes/MemoryMode';
import { VerseMode } from './ui/screens/modes/VerseMode';
import { SlingMode } from './ui/screens/modes/SlingMode';

export function App() {
  const screen = useScreen();
  return (
    <div className={`app screen-${screen}`}>
      <GameCanvas />
      <div className="ui-layer">
        {screen === 'splash' && <SplashScreen />}
        {screen === 'menu' && <MainMenu />}
        {screen === 'characters' && <CharacterSelect />}
        {screen === 'maps' && <MapSelect />}
        {screen === 'game' && <GameScreen />}
        {screen === 'records' && <RecordsScreen />}
        {screen === 'shop' && <ShopScreen />}
        {screen === 'achievements' && <AchievementsScreen />}
        {screen === 'missions' && <MissionsScreen />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'journey' && <JourneyScreen />}
        {screen === 'onboarding' && <OnboardingScreen />}
        {screen === 'modes' && <ModesScreen />}
        {screen === 'coins-info' && <CoinsInfoScreen />}
        {screen === 'parents' && <ParentsScreen />}
        {screen === 'world' && <WorldScreen />}
        {screen === 'mode-quiz' && <QuizMode />}
        {screen === 'mode-memory' && <MemoryMode />}
        {screen === 'mode-verse' && <VerseMode />}
        {screen === 'mode-sling' && <SlingMode />}
      </div>
      <Toasts />
    </div>
  );
}
