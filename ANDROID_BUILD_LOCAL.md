# Build Local do Android

Este projeto Android ainda nao traz `gradlew` no repositório, por isso o caminho mais simples para build local é usar o Android Studio.

## Requisitos

- Android Studio instalado
- Android SDK Platform 34
- Android Build-Tools 34.x
- JDK 17

## Preparação

1. Abra o Android Studio.
2. Escolha **Open** e selecione a pasta [android-app](C:\Users\admin\Vodoo\MineGuard\android-app).
3. Se o Android Studio pedir para instalar componentes em falta, aceite:
   - Android SDK 34
   - Build-Tools 34.x
   - Android SDK Command-line Tools
4. Copie [local.properties.example](C:\Users\admin\Vodoo\MineGuard\android-app\local.properties.example) para `android-app/local.properties`.
5. Ajuste `sdk.dir` para o caminho real do seu Android SDK.

Exemplo em Windows:

```properties
sdk.dir=C:\\Users\\admin\\AppData\\Local\\Android\\Sdk
```

## Gerar APK Debug

No Android Studio:

1. Espere o projeto sincronizar.
2. Vá em **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. A APK será gerada em:

```text
android-app/app/build/outputs/apk/debug/app-debug.apk
```

## Observações importantes

- O projeto Android usa `com.android.application` `8.2.2`, então JDK 17 é o alvo seguro para build local.
- O cliente Android agora monta `https://IP:porta` automaticamente.
- Como o servidor usa certificado autoassinado no ambiente local, o `WebView` foi ajustado para aceitar esse certificado durante a ligação ao servidor da app.

## Se o projeto não sincronizar

Verifique estes pontos:

- O Android Studio está a usar JDK 17.
- O SDK 34 está instalado.
- O ficheiro `android-app/local.properties` existe.
- A pasta aberta no Android Studio é `android-app`, não a raiz inteira do repositório.
