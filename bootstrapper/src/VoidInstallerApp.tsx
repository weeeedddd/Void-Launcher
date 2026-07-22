import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  chooseInstallDirectory,
  closeInstallerWindow,
  finishAndLaunch,
  getDefaultInstallPath,
  installClient,
  isNativeRuntime,
  minimizeInstallerWindow,
  subscribeToInstallerProgress,
  type IInstallClientResult,
  type IInstallerProgress,
} from "./installerApi";
import { ShadowGlyph } from "./ShadowGlyph";

export type InstallerState = "WELCOME" | "PATH_SELECT" | "DOWNLOADING_CLIENT" | "DONE";
type InstallerLanguageCode = "en" | "de" | "ru" | "ja" | "ko" | "fr" | "es";
type ValidationCode = "empty" | "long" | "slashes" | "absolute" | "characters" | "relative";

interface ICopy {
  languageName: string;
  brandSubtitle: string;
  preview: string;
  welcomeStep: string;
  pathStep: string;
  downloadStep: string;
  doneStep: string;
  welcomeTitle: string;
  welcomeBody: string;
  languageLabel: string;
  pathTitle: string;
  pathBody: string;
  pathLabel: string;
  browse: string;
  browsing: string;
  terms: string;
  termsHint: string;
  downloadTitle: string;
  downloadBody: string;
  completeTitle: string;
  completeBody: string;
  installedVersion: string;
  installedPath: string;
  next: string;
  back: string;
  install: string;
  finish: string;
  preparing: string;
  downloading: string;
  assembling: string;
  verifying: string;
  ready: string;
  downloaded: string;
  closeTitle: string;
  closeBody: string;
  cancel: string;
  close: string;
  minimize: string;
  validation: Record<ValidationCode, string>;
  nativeError: string;
  fallbackNotice: string;
}

const COPY: Record<InstallerLanguageCode, ICopy> = {
  en: {
    languageName: "English", brandSubtitle: "Void Launcher installer", preview: "Web preview: native actions are disabled",
    welcomeStep: "Welcome", pathStep: "Installation", downloadStep: "Download", doneStep: "Complete",
    welcomeTitle: "Enter the Void.", welcomeBody: "Choose your language, then install the standalone Void Launcher in a few clean steps.", languageLabel: "Language",
    pathTitle: "Choose an installation folder.", pathBody: "The launcher, managed Java runtimes, and local profiles will be stored here.", pathLabel: "Installation folder", browse: "Browse", browsing: "Opening…",
    terms: "I accept the Terms of Service and Privacy Policy", termsHint: "Required before the installer can download and write the client.",
    downloadTitle: "Installing Void Launcher", downloadBody: "The verified client payload is being downloaded and checked against its SHA-256 manifest.",
    completeTitle: "Void Launcher is ready.", completeBody: "Installation completed successfully. You can awaken the client now.", installedVersion: "Version", installedPath: "Installed to",
    next: "Next", back: "Back", install: "Install Void Launcher", finish: "Launch Void Launcher", preparing: "Preparing secure download…", downloading: "Downloading Void Launcher…", assembling: "Preparing the native runtime…", verifying: "Verifying downloaded files…", ready: "Installation complete", downloaded: "downloaded",
    closeTitle: "Cancel installation?", closeBody: "Closing now interrupts the active download. You can run the installer again later.", cancel: "Continue installing", close: "Close installer", minimize: "Minimize",
    validation: { empty: "Choose an installation folder.", long: "The path must contain 240 characters or fewer.", slashes: "Use a Windows path with backslashes.", absolute: "Enter an absolute Windows drive or network path.", characters: "The path contains a character Windows does not allow.", relative: "Relative path segments are not allowed." },
    nativeError: "The installer could not complete the action.", fallbackNotice: "The Windows default folder was unavailable, so the safe fallback remains selected.",
  },
  de: {
    languageName: "Deutsch", brandSubtitle: "Installationsprogramm für Void Launcher", preview: "Web-Vorschau: Native Aktionen sind deaktiviert",
    welcomeStep: "Willkommen", pathStep: "Installation", downloadStep: "Download", doneStep: "Fertig",
    welcomeTitle: "Betritt die Leere.", welcomeBody: "Wähle deine Sprache und installiere den eigenständigen Void Launcher in wenigen übersichtlichen Schritten.", languageLabel: "Sprache",
    pathTitle: "Wähle einen Installationsordner.", pathBody: "Launcher, verwaltete Java-Laufzeiten und lokale Profile werden hier gespeichert.", pathLabel: "Installationsordner", browse: "Durchsuchen", browsing: "Wird geöffnet…",
    terms: "Ich akzeptiere die Nutzungsbedingungen und Datenschutzerklärung", termsHint: "Erforderlich, bevor der Client heruntergeladen und gespeichert werden kann.",
    downloadTitle: "Void Launcher wird installiert", downloadBody: "Das signierte Client-Paket wird heruntergeladen und geprüft.",
    completeTitle: "Void Launcher ist bereit.", completeBody: "Die Installation wurde erfolgreich abgeschlossen. Du kannst den Client jetzt starten.", installedVersion: "Version", installedPath: "Installiert unter",
    next: "Weiter", back: "Zurück", install: "Void Launcher installieren", finish: "Void starten", preparing: "Sicherer Download wird vorbereitet…", downloading: "Void Launcher wird heruntergeladen…", assembling: "Native Laufzeit wird vorbereitet…", verifying: "Heruntergeladene Dateien werden geprüft…", ready: "Installation abgeschlossen", downloaded: "heruntergeladen",
    closeTitle: "Installation abbrechen?", closeBody: "Beim Schließen wird der aktive Download unterbrochen. Du kannst den Installer später erneut starten.", cancel: "Installation fortsetzen", close: "Installer schließen", minimize: "Minimieren",
    validation: { empty: "Wähle einen Installationsordner.", long: "Der Pfad darf höchstens 240 Zeichen enthalten.", slashes: "Verwende einen Windows-Pfad mit umgekehrten Schrägstrichen.", absolute: "Gib einen absoluten Windows- oder Netzwerkpfad ein.", characters: "Der Pfad enthält ein unter Windows unzulässiges Zeichen.", relative: "Relative Pfadbestandteile sind nicht erlaubt." },
    nativeError: "Der Installer konnte die Aktion nicht abschließen.", fallbackNotice: "Der Windows-Standardordner war nicht verfügbar. Der sichere Ersatzpfad bleibt ausgewählt.",
  },
  ru: {
    languageName: "Русский", brandSubtitle: "Установщик Void Launcher", preview: "Веб-предпросмотр: системные действия отключены",
    welcomeStep: "Добро пожаловать", pathStep: "Установка", downloadStep: "Загрузка", doneStep: "Готово",
    welcomeTitle: "Войдите в Пустоту.", welcomeBody: "Выберите язык и установите отдельный Void Launcher за несколько простых шагов.", languageLabel: "Язык",
    pathTitle: "Выберите папку установки.", pathBody: "Здесь будут храниться лаунчер, управляемая Java и локальные профили.", pathLabel: "Папка установки", browse: "Обзор", browsing: "Открытие…",
    terms: "Я принимаю Условия использования и Политику конфиденциальности", termsHint: "Необходимо для загрузки и записи клиента.",
    downloadTitle: "Установка Void Launcher", downloadBody: "Проверенный пакет клиента загружается и сверяется с манифестом SHA-256.",
    completeTitle: "Void Launcher готов.", completeBody: "Установка успешно завершена. Теперь можно запустить клиент.", installedVersion: "Версия", installedPath: "Папка",
    next: "Далее", back: "Назад", install: "Установить Void Launcher", finish: "Запустить Void", preparing: "Подготовка безопасной загрузки…", downloading: "Загрузка Void Launcher…", assembling: "Подготовка среды выполнения…", verifying: "Проверка загруженных файлов…", ready: "Установка завершена", downloaded: "загружено",
    closeTitle: "Отменить установку?", closeBody: "Закрытие прервёт активную загрузку. Установщик можно запустить позже.", cancel: "Продолжить установку", close: "Закрыть установщик", minimize: "Свернуть",
    validation: { empty: "Выберите папку установки.", long: "Путь должен содержать не более 240 символов.", slashes: "Используйте путь Windows с обратными слешами.", absolute: "Введите абсолютный путь Windows или сетевой путь.", characters: "Путь содержит недопустимый символ Windows.", relative: "Относительные сегменты пути запрещены." },
    nativeError: "Установщик не смог выполнить действие.", fallbackNotice: "Стандартная папка Windows недоступна, выбран безопасный резервный путь.",
  },
  ja: {
    languageName: "日本語", brandSubtitle: "Void Launcher インストーラー", preview: "Web プレビュー: ネイティブ操作は無効です",
    welcomeStep: "ようこそ", pathStep: "インストール", downloadStep: "ダウンロード", doneStep: "完了",
    welcomeTitle: "Void へようこそ。", welcomeBody: "言語を選び、いくつかの簡単な手順で Void Launcher をインストールします。", languageLabel: "言語",
    pathTitle: "インストール先を選択。", pathBody: "ランチャー、Java ランタイム、ローカルプロファイルが保存されます。", pathLabel: "インストール先", browse: "参照", browsing: "開いています…",
    terms: "利用規約とプライバシーポリシーに同意します", termsHint: "クライアントをダウンロードする前に必要です。",
    downloadTitle: "Void Launcher をインストール中", downloadBody: "検証済みのクライアントをダウンロードし、SHA-256 マニフェストと照合しています。",
    completeTitle: "Void Launcher の準備完了。", completeBody: "インストールが完了しました。クライアントを起動できます。", installedVersion: "バージョン", installedPath: "インストール先",
    next: "次へ", back: "戻る", install: "Void Launcher をインストール", finish: "Void を起動", preparing: "安全なダウンロードを準備中…", downloading: "Void Launcher をダウンロード中…", assembling: "ランタイムを準備中…", verifying: "ファイルを検証中…", ready: "インストール完了", downloaded: "ダウンロード済み",
    closeTitle: "インストールを中止しますか？", closeBody: "閉じるとダウンロードが中断されます。後で再実行できます。", cancel: "インストールを続ける", close: "閉じる", minimize: "最小化",
    validation: { empty: "インストール先を選択してください。", long: "パスは 240 文字以内にしてください。", slashes: "Windows のバックスラッシュ形式を使用してください。", absolute: "絶対パスまたはネットワークパスを入力してください。", characters: "Windows で使用できない文字が含まれています。", relative: "相対パスは使用できません。" },
    nativeError: "インストーラーが操作を完了できませんでした。", fallbackNotice: "Windows の既定フォルダーを取得できないため、安全な代替パスを使用します。",
  },
  ko: {
    languageName: "한국어", brandSubtitle: "Void Launcher 설치 프로그램", preview: "웹 미리보기: 시스템 작업이 비활성화됨",
    welcomeStep: "환영합니다", pathStep: "설치", downloadStep: "다운로드", doneStep: "완료",
    welcomeTitle: "Void에 입장하세요.", welcomeBody: "언어를 선택하고 간단한 단계로 독립형 Void Launcher를 설치하세요.", languageLabel: "언어",
    pathTitle: "설치 폴더를 선택하세요.", pathBody: "런처, 관리형 Java 런타임 및 로컬 프로필이 저장됩니다.", pathLabel: "설치 폴더", browse: "찾아보기", browsing: "여는 중…",
    terms: "서비스 약관 및 개인정보 보호정책에 동의합니다", termsHint: "클라이언트를 다운로드하고 저장하기 전에 필요합니다.",
    downloadTitle: "Void Launcher 설치 중", downloadBody: "서명된 클라이언트 패키지를 다운로드하고 확인하고 있습니다.",
    completeTitle: "Void Launcher가 준비되었습니다.", completeBody: "설치가 완료되었습니다. 이제 클라이언트를 시작할 수 있습니다.", installedVersion: "버전", installedPath: "설치 위치",
    next: "다음", back: "뒤로", install: "Void Launcher 설치", finish: "Void 시작", preparing: "안전한 다운로드 준비 중…", downloading: "Void Launcher 다운로드 중…", assembling: "런타임 준비 중…", verifying: "파일 확인 중…", ready: "설치 완료", downloaded: "다운로드됨",
    closeTitle: "설치를 취소할까요?", closeBody: "지금 닫으면 다운로드가 중단됩니다. 나중에 다시 실행할 수 있습니다.", cancel: "설치 계속", close: "설치 프로그램 닫기", minimize: "최소화",
    validation: { empty: "설치 폴더를 선택하세요.", long: "경로는 240자 이하여야 합니다.", slashes: "Windows 백슬래시 경로를 사용하세요.", absolute: "절대 Windows 또는 네트워크 경로를 입력하세요.", characters: "Windows에서 허용되지 않는 문자가 있습니다.", relative: "상대 경로는 허용되지 않습니다." },
    nativeError: "설치 프로그램이 작업을 완료하지 못했습니다.", fallbackNotice: "Windows 기본 폴더를 사용할 수 없어 안전한 대체 경로를 선택했습니다.",
  },
  fr: {
    languageName: "Français", brandSubtitle: "Programme d’installation de Void Launcher", preview: "Aperçu web : actions natives désactivées",
    welcomeStep: "Bienvenue", pathStep: "Installation", downloadStep: "Téléchargement", doneStep: "Terminé",
    welcomeTitle: "Entrez dans le Void.", welcomeBody: "Choisissez votre langue, puis installez Void Launcher en quelques étapes simples.", languageLabel: "Langue",
    pathTitle: "Choisissez un dossier d’installation.", pathBody: "Le launcher, Java et les profils locaux seront stockés ici.", pathLabel: "Dossier d’installation", browse: "Parcourir", browsing: "Ouverture…",
    terms: "J’accepte les Conditions d’utilisation et la Politique de confidentialité", termsHint: "Obligatoire avant le téléchargement du client.", downloadTitle: "Installation de Void Launcher", downloadBody: "Le client signé est téléchargé et vérifié.", completeTitle: "Void Launcher est prêt.", completeBody: "L’installation est terminée. Vous pouvez démarrer le client.", installedVersion: "Version", installedPath: "Installé dans",
    next: "Suivant", back: "Retour", install: "Installer Void Launcher", finish: "Éveiller Void", preparing: "Préparation du téléchargement…", downloading: "Téléchargement de Void Launcher…", assembling: "Préparation de Java…", verifying: "Vérification des fichiers…", ready: "Installation terminée", downloaded: "téléchargé",
    closeTitle: "Annuler l’installation ?", closeBody: "La fermeture interrompra le téléchargement actif.", cancel: "Continuer", close: "Fermer", minimize: "Réduire",
    validation: { empty: "Choisissez un dossier d’installation.", long: "Le chemin doit contenir 240 caractères maximum.", slashes: "Utilisez un chemin Windows avec des barres inverses.", absolute: "Saisissez un chemin Windows ou réseau absolu.", characters: "Le chemin contient un caractère interdit.", relative: "Les segments relatifs ne sont pas autorisés." }, nativeError: "L’installateur n’a pas pu terminer l’action.", fallbackNotice: "Le dossier Windows par défaut est indisponible ; le chemin de secours reste sélectionné.",
  },
  es: {
    languageName: "Español", brandSubtitle: "Instalador de Void Launcher", preview: "Vista web: acciones nativas desactivadas",
    welcomeStep: "Bienvenida", pathStep: "Instalación", downloadStep: "Descarga", doneStep: "Completo",
    welcomeTitle: "Entra en el Void.", welcomeBody: "Elige tu idioma e instala Void Launcher en unos pocos pasos.", languageLabel: "Idioma",
    pathTitle: "Elige una carpeta de instalación.", pathBody: "El launcher, Java y los perfiles locales se guardarán aquí.", pathLabel: "Carpeta de instalación", browse: "Examinar", browsing: "Abriendo…",
    terms: "Acepto los Términos de servicio y la Política de privacidad", termsHint: "Obligatorio antes de descargar el cliente.", downloadTitle: "Instalando Void Launcher", downloadBody: "El cliente verificado se está descargando y comparando con su manifiesto SHA-256.", completeTitle: "Void Launcher está listo.", completeBody: "La instalación terminó correctamente. Ya puedes iniciar el cliente.", installedVersion: "Versión", installedPath: "Instalado en",
    next: "Siguiente", back: "Atrás", install: "Instalar Void Launcher", finish: "Despertar Void", preparing: "Preparando descarga segura…", downloading: "Descargando Void Launcher…", assembling: "Preparando Java…", verifying: "Verificando archivos…", ready: "Instalación completa", downloaded: "descargado",
    closeTitle: "¿Cancelar la instalación?", closeBody: "Cerrar interrumpirá la descarga activa.", cancel: "Continuar", close: "Cerrar instalador", minimize: "Minimizar",
    validation: { empty: "Elige una carpeta de instalación.", long: "La ruta debe tener 240 caracteres o menos.", slashes: "Usa una ruta de Windows con barras invertidas.", absolute: "Introduce una ruta absoluta de Windows o red.", characters: "La ruta contiene un carácter no permitido.", relative: "No se permiten segmentos relativos." }, nativeError: "El instalador no pudo completar la acción.", fallbackNotice: "La carpeta predeterminada no está disponible; se mantiene la ruta segura alternativa.",
  },
};

const LANGUAGES = (Object.keys(COPY) as InstallerLanguageCode[]).map((code) => ({ code, label: COPY[code].languageName }));
const FALLBACK_PATH = "C:\\Users\\Username\\AppData\\Local\\Programs\\Void Launcher";
function validationCode(value: string): ValidationCode | null {
  const path = value.trim();
  if (!path) return "empty";
  if (path.length > 240) return "long";
  if (path.includes("/")) return "slashes";
  const drive = /^[A-Za-z]:\\/.test(path);
  const network = /^\\\\[^\\]+\\[^\\]+/.test(path);
  if (!drive && !network) return "absolute";
  const body = drive ? path.slice(2) : path;
  if (/[<>:"|?*\u0000-\u001F]/.test(body)) return "characters";
  if (path.split("\\").filter(Boolean).some((part) => part === "." || part === "..")) return "relative";
  return null;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, 220);
}

function statusText(copy: ICopy, percentage: number) {
  if (percentage >= 94) return copy.verifying;
  if (percentage >= 58) return copy.assembling;
  if (percentage >= 12) return copy.downloading;
  return copy.preparing;
}

export function VoidInstallerApp() {
  const [state, setState] = useState<InstallerState>("WELCOME");
  const [language, setLanguage] = useState<InstallerLanguageCode>("en");
  const [installationPath, setInstallationPath] = useState(FALLBACK_PATH);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pathTouched, setPathTouched] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [result, setResult] = useState<IInstallClientResult | null>(null);
  const [progress, setProgress] = useState<IInstallerProgress>({ downloadedBytes: 0, totalBytes: 0, percentage: 0, status: "" });
  const unlistenRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const nativeRuntime = useMemo(() => isNativeRuntime(), []);
  const reducedMotion = Boolean(useReducedMotion());
  const copy = COPY[language];
  const pathCode = validationCode(installationPath);
  const canInstall = nativeRuntime && pathCode === null && acceptedTerms && !isBrowsing;
  const stepIndex = (["WELCOME", "PATH_SELECT", "DOWNLOADING_CLIENT", "DONE"] as InstallerState[]).indexOf(state);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    mountedRef.current = true;
    if (nativeRuntime) {
      void getDefaultInstallPath().then((path) => {
        if (mountedRef.current && path.trim()) setInstallationPath(path.trim());
      }).catch(() => setNotice(copy.fallbackNotice));
    }
    return () => {
      mountedRef.current = false;
      unlistenRef.current?.();
    };
  }, [copy.fallbackNotice, nativeRuntime]);

  const browse = useCallback(async () => {
    setIsBrowsing(true);
    setError(null);
    try {
      if (nativeRuntime) {
        const selected = await chooseInstallDirectory(installationPath.trim() || FALLBACK_PATH);
        if (selected) setInstallationPath(selected);
      } else {
        setNotice(copy.preview);
      }
      setPathTouched(true);
    } catch (cause) {
      setError(`${copy.nativeError} ${safeError(cause)}`);
    } finally {
      setIsBrowsing(false);
    }
  }, [copy.nativeError, installationPath, nativeRuntime]);

  const install = useCallback(async () => {
    setPathTouched(true);
    setError(null);
    setNotice(null);
    if (!canInstall || state !== "PATH_SELECT") return;
    setState("DOWNLOADING_CLIENT");
    setProgress({ downloadedBytes: 0, totalBytes: 0, percentage: 0, status: "" });
    try {
      unlistenRef.current = await subscribeToInstallerProgress((next) => setProgress((current) => ({ ...next, percentage: Math.max(current.percentage, next.percentage) })));
      const installed = await installClient(installationPath.trim());
      setResult(installed);
      setProgress((current) => ({ ...current, downloadedBytes: current.totalBytes || current.downloadedBytes, percentage: 100 }));
      window.setTimeout(() => mountedRef.current && setState("DONE"), reducedMotion ? 10 : 260);
    } catch (cause) {
      setError(`${copy.nativeError} ${safeError(cause)}`);
      setState("PATH_SELECT");
    } finally {
      unlistenRef.current?.();
      unlistenRef.current = null;
    }
  }, [canInstall, copy.nativeError, installationPath, reducedMotion, state]);

  const finish = useCallback(async () => {
    try {
      if (nativeRuntime) await finishAndLaunch();
      else setNotice(copy.preview);
    } catch (cause) {
      setError(`${copy.nativeError} ${safeError(cause)}`);
    }
  }, [copy.nativeError, copy.preview, nativeRuntime]);

  const close = useCallback(async () => {
    setCloseOpen(false);
    if (nativeRuntime) await closeInstallerWindow();
    else setNotice(copy.preview);
  }, [copy.preview, nativeRuntime]);

  const minimize = useCallback(async () => {
    if (nativeRuntime) await minimizeInstallerWindow();
    else setNotice(copy.preview);
  }, [copy.preview, nativeRuntime]);

  const requestClose = useCallback(() => {
    if (state === "DOWNLOADING_CLIENT") setCloseOpen(true);
    else void close();
  }, [close, state]);

  const steps = [copy.welcomeStep, copy.pathStep, copy.downloadStep, copy.doneStep];

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#111111] p-4 text-white selection:bg-[#7B2CBF]">
      <section className="flex h-[min(760px,calc(100vh-32px))] w-[min(1120px,calc(100vw-32px))] flex-col overflow-hidden rounded-sm border border-[#333333] bg-[#111111]">
        <header
          data-tauri-drag-region
          className="flex h-16 shrink-0 items-center border-b border-[#333333] bg-[#1A1A1A] px-5"
        >
          <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-10 place-items-center rounded-sm border border-[#333333] bg-[#7B2CBF] text-white">
              <ShadowGlyph name="mark" size={26} />
            </span>
            <span data-tauri-drag-region>
              <strong className="font-display block text-xs font-black tracking-[0.12em]">VOID LAUNCHER</strong>
              <small className="mt-0.5 block text-[9px] text-[#A3A3A3]">{copy.brandSubtitle}</small>
            </span>
          </div>
          <div className="ml-4 flex">
            <button
              type="button"
              onClick={minimize}
              aria-label={copy.minimize}
              title={copy.minimize}
              className="grid size-11 cursor-pointer place-items-center border-l border-[#333333] text-[#A3A3A3] transition-colors hover:bg-[#252525] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#7B2CBF]"
            >
              <ShadowGlyph name="minimize" size={15} />
            </button>
            <button
              type="button"
              onClick={requestClose}
              aria-label={copy.close}
              title={copy.close}
              className="grid size-11 cursor-pointer place-items-center border-l border-[#333333] text-[#A3A3A3] transition-colors hover:bg-[#55202B] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#7B2CBF]"
            >
              <ShadowGlyph name="close" size={15} />
            </button>
          </div>
        </header>

        {!nativeRuntime && (
          <div className="border-b border-[#333333] bg-[#2C2516] px-5 py-2 text-center text-[9px] font-bold text-[#F2D18A]">
            {copy.preview}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[#333333] bg-[#111111] px-5 py-3 sm:px-8">
            <ol className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
              {steps.map((label, index) => (
                <li
                  key={label}
                  aria-current={index === stepIndex ? "step" : undefined}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-sm border border-[#333333] px-2 py-1.5 transition-colors ${
                    index === stepIndex
                      ? "bg-[#7B2CBF] text-white"
                      : index < stepIndex
                        ? "bg-[#1A1A1A] text-[#D4D4D4]"
                        : "bg-[#111111] text-[#737373]"
                  }`}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-sm border border-[#333333] text-[10px] font-black">
                    {index < stepIndex ? <ShadowGlyph name="check" size={12} /> : index + 1}
                  </span>
                  <span className="hidden text-[10px] font-bold sm:block">{label}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-9 lg:p-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeOut" }}
              >
                {state === "WELCOME" && (
                  <div className="mx-auto max-w-2xl py-4 sm:py-10">
                    <span className="grid size-24 place-items-center rounded-sm border border-[#333333] bg-[#1A1A1A] text-[#7B2CBF]" aria-hidden="true">
                      <ShadowGlyph name="mark" size={58} />
                    </span>
                    <h1 className="font-display mt-7 text-[clamp(2rem,5vw,4rem)] leading-[0.95] font-black tracking-[-0.04em]">
                      {copy.welcomeTitle}
                    </h1>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-[#A3A3A3]">{copy.welcomeBody}</p>
                    <label htmlFor="installer-language" className="mt-9 block max-w-sm">
                      <span className="mb-2 block text-[10px] font-black tracking-[0.1em] text-[#D4D4D4] uppercase">{copy.languageLabel}</span>
                      <select
                        id="installer-language"
                        value={language}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => setLanguage(event.target.value as InstallerLanguageCode)}
                        className="h-13 w-full cursor-pointer rounded-sm border border-[#333333] bg-[#1A1A1A] px-4 text-sm text-white outline-none transition-colors focus:border-[#7B2CBF] focus:outline-2 focus:outline-offset-2 focus:outline-[#7B2CBF]"
                      >
                        {LANGUAGES.map((item) => (
                          <option key={item.code} value={item.code}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {state === "PATH_SELECT" && (
                  <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-black tracking-[0.12em] text-[#9D6DC0] uppercase">{copy.pathStep}</p>
                    <h1 className="font-display mt-3 text-[clamp(1.8rem,4vw,3.4rem)] leading-none font-black tracking-[-0.04em]">{copy.pathTitle}</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-[#A3A3A3]">{copy.pathBody}</p>
                    <label htmlFor="install-path" className="mt-8 block">
                      <span className="mb-2 block text-[10px] font-black tracking-[0.1em] text-[#D4D4D4] uppercase">{copy.pathLabel}</span>
                      <span className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          id="install-path"
                          value={installationPath}
                          onChange={(event) => {
                            setInstallationPath(event.target.value);
                            setPathTouched(true);
                            setError(null);
                          }}
                          spellCheck={false}
                          className="h-13 min-w-0 rounded-sm border border-[#333333] bg-[#1A1A1A] px-4 text-sm text-white outline-none transition-colors focus:border-[#7B2CBF] focus:outline-2 focus:outline-offset-2 focus:outline-[#7B2CBF]"
                        />
                        <button
                          type="button"
                          onClick={() => void browse()}
                          disabled={isBrowsing}
                          className="inline-flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-sm border border-[#333333] bg-[#1A1A1A] px-5 text-xs font-black text-white transition-colors hover:bg-[#252525] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B2CBF] disabled:cursor-wait disabled:opacity-50"
                        >
                          <ShadowGlyph name="folder" size={16} />
                          {isBrowsing ? copy.browsing : copy.browse}
                        </button>
                      </span>
                    </label>
                    {pathTouched && pathCode && <p role="alert" className="mt-2 text-xs text-[#FF9CAB]">{copy.validation[pathCode]}</p>}
                    <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-sm border border-[#333333] bg-[#1A1A1A] p-4 transition-colors hover:bg-[#202020]">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(event) => setAcceptedTerms(event.target.checked)}
                        className="mt-0.5 size-5 cursor-pointer accent-[#7B2CBF]"
                      />
                      <span>
                        <strong className="block text-sm text-white">{copy.terms}</strong>
                        <small className="mt-1 block text-[10px] leading-4 text-[#A3A3A3]">{copy.termsHint}</small>
                      </span>
                    </label>
                  </div>
                )}

                {state === "DOWNLOADING_CLIENT" && (
                  <div className="mx-auto max-w-2xl py-8 text-center">
                    <div className="relative mx-auto grid size-20 place-items-center rounded-sm border border-[#333333] bg-[#1A1A1A]">
                      <motion.span
                        aria-hidden="true"
                        animate={reducedMotion ? undefined : { rotate: 360 }}
                        transition={{ duration: 1.15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-1 border border-[#333333] border-t-[#7B2CBF]"
                      />
                      <ShadowGlyph name="mark" size={42} className="text-[#7B2CBF]" />
                    </div>
                    <h1 className="font-display mt-8 text-3xl font-black">{copy.downloadTitle}</h1>
                    <p className="mt-3 text-sm text-[#A3A3A3]">{copy.downloadBody}</p>
                    <div
                      className="mt-9 h-4 overflow-hidden rounded-sm border border-[#333333] bg-[#1A1A1A] p-0.5"
                      role="progressbar"
                      aria-label={copy.downloadTitle}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(progress.percentage)}
                    >
                      <motion.div
                        className="h-full origin-left bg-[#7B2CBF]"
                        animate={{ scaleX: Math.max(0.01, progress.percentage / 100) }}
                        transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-[#A3A3A3]">
                      <span>{statusText(copy, progress.percentage)}</span>
                      <strong className="text-white tabular-nums">{progress.percentage.toFixed(0)}%</strong>
                    </div>
                    <p className="mt-2 text-[9px] text-[#737373]">
                      {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)} {copy.downloaded}
                    </p>
                  </div>
                )}

                {state === "DONE" && (
                  <div className="mx-auto max-w-2xl py-8 text-center">
                    <span className="mx-auto grid size-20 place-items-center rounded-sm border border-[#333333] bg-[#1A1A1A] text-[#72F2A8]">
                      <ShadowGlyph name="check" size={34} />
                    </span>
                    <h1 className="font-display mt-7 text-3xl font-black">{copy.completeTitle}</h1>
                    <p className="mt-3 text-sm text-[#A3A3A3]">{copy.completeBody}</p>
                    {result && (
                      <dl className="mx-auto mt-7 grid max-w-xl gap-3 text-left sm:grid-cols-2">
                        <div className="rounded-sm border border-[#333333] bg-[#1A1A1A] p-4">
                          <dt className="text-[10px] font-black tracking-[0.1em] text-[#A3A3A3] uppercase">{copy.installedVersion}</dt>
                          <dd className="mt-2 text-xs font-bold text-white">{result.version}</dd>
                        </div>
                        <div className="rounded-sm border border-[#333333] bg-[#1A1A1A] p-4">
                          <dt className="text-[10px] font-black tracking-[0.1em] text-[#A3A3A3] uppercase">{copy.installedPath}</dt>
                          <dd className="mt-2 truncate text-xs font-bold text-white" title={result.installedExecutable}>{result.installedExecutable}</dd>
                        </div>
                      </dl>
                    )}
                    {result?.shortcutWarning && (
                      <div role="status" className="mx-auto mt-4 flex max-w-xl items-start gap-2 rounded-sm border border-[#333333] bg-[#2C2516] px-4 py-3 text-left text-xs leading-5 text-[#F2D18A]">
                        <ShadowGlyph name="shield" size={16} className="mt-0.5 shrink-0" />
                        <span>{result.shortcutWarning}</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {(error || notice) && (
              <div
                className={`mt-5 flex items-start gap-2 rounded-sm border border-[#333333] px-4 py-3 text-xs ${
                  error ? "bg-[#35181F] text-[#FFB4C0]" : "bg-[#2C2516] text-[#F2D18A]"
                }`}
                role={error ? "alert" : "status"}
              >
                <ShadowGlyph name={error ? "close" : "shield"} size={15} className="mt-0.5 shrink-0" />
                <span>{error ?? notice}</span>
              </div>
            )}
          </div>
        </div>

        <footer className="flex min-h-20 shrink-0 items-center justify-between gap-3 border-t border-[#333333] bg-[#1A1A1A] px-5 sm:px-8">
          <div>
            {state === "PATH_SELECT" && (
              <button
                type="button"
                onClick={() => {
                  setState("WELCOME");
                  setError(null);
                }}
                className="min-h-12 cursor-pointer rounded-sm border border-[#333333] bg-[#111111] px-6 text-xs font-black text-[#D4D4D4] transition-colors hover:bg-[#252525] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B2CBF]"
              >
                {copy.back}
              </button>
            )}
          </div>
          {state === "WELCOME" && (
            <button
              type="button"
              onClick={() => setState("PATH_SELECT")}
              className="min-h-12 min-w-40 cursor-pointer rounded-sm border border-[#333333] bg-[#7B2CBF] px-6 text-xs font-black tracking-[0.08em] text-white transition-colors hover:bg-[#8C3CCF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {copy.next}
            </button>
          )}
          {state === "PATH_SELECT" && (
            <button
              type="button"
              onClick={() => void install()}
              disabled={!canInstall}
              className="min-h-12 cursor-pointer rounded-sm border border-[#333333] bg-[#7B2CBF] px-6 text-xs font-black tracking-[0.06em] text-white transition-colors hover:bg-[#8C3CCF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-[#3A3A3A] disabled:text-[#808080]"
            >
              <span className="inline-flex items-center gap-2"><ShadowGlyph name="download" size={16} />{copy.install}</span>
            </button>
          )}
          {state === "DONE" && (
            <button
              type="button"
              onClick={() => void finish()}
              className="min-h-12 cursor-pointer rounded-sm border border-[#333333] bg-[#7B2CBF] px-7 text-xs font-black tracking-[0.08em] text-white transition-colors hover:bg-[#8C3CCF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="inline-flex items-center gap-2"><ShadowGlyph name="launch" size={17} />{copy.finish}</span>
            </button>
          )}
        </footer>
      </section>

      <AnimatePresence>
        {closeOpen && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#111111] p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="close-title"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              className="w-full max-w-md rounded-sm border border-[#333333] bg-[#1A1A1A] p-6"
            >
              <h2 id="close-title" className="font-display text-xl font-black">{copy.closeTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-[#A3A3A3]">{copy.closeBody}</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCloseOpen(false)}
                  className="min-h-12 cursor-pointer rounded-sm border border-[#333333] bg-[#111111] px-4 text-xs font-bold transition-colors hover:bg-[#252525] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7B2CBF]"
                >
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void close()}
                  className="min-h-12 cursor-pointer rounded-sm border border-[#333333] bg-[#55202B] px-4 text-xs font-bold text-white transition-colors hover:bg-[#6B2634] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF9CAB]"
                >
                  {copy.close}
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default VoidInstallerApp;
