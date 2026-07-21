import type { ClientLanguageCode, VoidView } from "./types";

export interface IClientCopy {
  languageName: string;
  home: string;
  instances: string;
  archive: string;
  performance: string;
  settings: string;
  news: string;
  online: string;
  sessionSecurity: string;
  language: string;
  languageDescription: string;
  close: string;
  welcome: string;
  launch: string;
  launching: string;
  missionControl: string;
  clearLogs: string;
  hideConsole: string;
}

export const CLIENT_COPY: Record<ClientLanguageCode, IClientCopy> = {
  en: { languageName: "English", home: "Home", instances: "Instances", archive: "Shadow Archive", performance: "Performance", settings: "Settings", news: "News", online: "Online", sessionSecurity: "Session security", language: "Language", languageDescription: "Change the launcher language instantly.", close: "Close", welcome: "Welcome to the Void", launch: "Launch Void", launching: "Launching…", missionControl: "Mission Control", clearLogs: "Clear logs", hideConsole: "Hide console" },
  de: { languageName: "Deutsch", home: "Start", instances: "Instanzen", archive: "Shadow-Archiv", performance: "Leistung", settings: "Einstellungen", news: "Neuigkeiten", online: "Online", sessionSecurity: "Sitzungssicherheit", language: "Sprache", languageDescription: "Ändere die Sprache des Launchers sofort.", close: "Schließen", welcome: "Willkommen im Void", launch: "Void starten", launching: "Wird gestartet…", missionControl: "Startkonsole", clearLogs: "Protokoll leeren", hideConsole: "Konsole ausblenden" },
  ru: { languageName: "Русский", home: "Главная", instances: "Профили", archive: "Архив", performance: "Производительность", settings: "Настройки", news: "Новости", online: "В сети", sessionSecurity: "Безопасность сеанса", language: "Язык", languageDescription: "Мгновенно сменить язык лаунчера.", close: "Закрыть", welcome: "Добро пожаловать в Void", launch: "Запустить Void", launching: "Запуск…", missionControl: "Консоль запуска", clearLogs: "Очистить журнал", hideConsole: "Скрыть консоль" },
  ja: { languageName: "日本語", home: "ホーム", instances: "インスタンス", archive: "アーカイブ", performance: "パフォーマンス", settings: "設定", news: "ニュース", online: "オンライン", sessionSecurity: "セッション保護", language: "言語", languageDescription: "ランチャーの言語をすぐに変更します。", close: "閉じる", welcome: "Void へようこそ", launch: "Void を起動", launching: "起動中…", missionControl: "起動コンソール", clearLogs: "ログを消去", hideConsole: "コンソールを隠す" },
  ko: { languageName: "한국어", home: "홈", instances: "인스턴스", archive: "아카이브", performance: "성능", settings: "설정", news: "소식", online: "온라인", sessionSecurity: "세션 보안", language: "언어", languageDescription: "런처 언어를 즉시 변경합니다.", close: "닫기", welcome: "Void에 오신 것을 환영합니다", launch: "Void 시작", launching: "시작 중…", missionControl: "시작 콘솔", clearLogs: "로그 지우기", hideConsole: "콘솔 숨기기" },
};

export const CLIENT_LANGUAGES = (Object.keys(CLIENT_COPY) as ClientLanguageCode[]).map((code) => ({ code, label: CLIENT_COPY[code].languageName }));

export function translatedViewLabel(language: ClientLanguageCode, view: VoidView) {
  const copy = CLIENT_COPY[language];
  const labels: Record<VoidView, string> = { dashboard: copy.home, deployments: copy.instances, mods: copy.archive, telemetry: copy.performance, settings: copy.settings, chronicle: copy.news, systems: "Shadow Systems" };
  return labels[view];
}
