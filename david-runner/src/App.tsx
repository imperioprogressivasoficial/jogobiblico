import { GameCanvas } from './ui/GameCanvas';
import { Toasts } from './ui/components/common';
import { useScreen } from './ui/UIManager';
import { AchievementsScreen } from './ui/screens/AchievementsScreen';
import { CharacterSelect } from './ui/screens/CharacterSelect';
import { GameScreen } from './ui/screens/GameScreen';
import { MainMenu } from './ui/screens/MainMenu';
import { MapSelect } from './ui/screens/MapSelect';
import { MissionsScreen } from './ui/screens/MissionsScreen';
import { RecordsScreen } from './ui/screens/RecordsScreen';
import { ScrollsScreen } from './ui/screens/ScrollsScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { ShopScreen } from './ui/screens/ShopScreen';
import { SplashScreen } from './ui/screens/SplashScreen';

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
        {screen === 'scrolls' && <ScrollsScreen />}
      </div>
      <Toasts />
    </div>
  );
}
