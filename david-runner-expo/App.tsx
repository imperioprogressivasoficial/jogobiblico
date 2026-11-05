import { useEffect, useRef } from 'react';
import { AppState, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { GAME_HTML } from './src/gameHtml';
import { configureGameAudio } from './src/audioMode';

/**
 * App Expo do DAVID RUNNER: o jogo 3D (WebGL) roda dentro de uma WebView em tela cheia.
 * Funciona no Expo Go (iPhone e Android) e também em builds nativos (EAS Build).
 */
export default function App() {
  const web = useRef<WebView<{}>>(null);

  useEffect(() => {
    void configureGameAudio();
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

    // Android: botão "voltar" pausa a corrida / volta de tela; no menu fecha o app.
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      web.current?.injectJavaScript(
        "(function(){var d=window.__davidRunner;var r=d&&d.ui.handleBack();window.ReactNativeWebView.postMessage(r?'back:handled':'back:exit');})();true;",
      );
      return true;
    });
    // App em segundo plano: pausa a corrida.
    const state = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        web.current?.injectJavaScript(
          "(function(){var e=window.__davidRunner&&window.__davidRunner.engine;if(e&&e.mode==='playing')e.pause();})();true;",
        );
      }
    });
    return () => {
      back.remove();
      state.remove();
    };
  }, []);

  const onMessage = (e: WebViewMessageEvent) => {
    if (e.nativeEvent.data === 'back:exit') BackHandler.exitApp();
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <WebView
        ref={web}
        style={styles.web}
        originWhitelist={['*']}
        // origem fixa: o salvamento do progresso (localStorage) persiste entre aberturas
        source={{ html: GAME_HTML, baseUrl: 'https://davidrunner.app/' }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        hideKeyboardAccessoryView
        textZoom={100}
        androidLayerType="hardware"
        onMessage={onMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3d9be9' },
  web: { flex: 1, backgroundColor: '#3d9be9' },
});
