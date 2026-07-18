; Void Launcher — NSIS installer hooks
; Referenced from tauri.conf.json → bundle.windows.nsis.installerHooks.
;
; Tauri's NSIS template invokes these four macros at fixed points, which is
; the sanctioned way to extend the installer without forking the whole
; template. Full guide: docs/DISTRIBUTION.md.
;
; Sound: NSIS has no audio API of its own, but winmm.dll (part of Windows)
; can play WAV files. Ship a short chime as a bundle resource
; (src-tauri/sounds/done.wav + `"resources": ["sounds/done.wav"]`) and the
; post-install hook below picks it up. The hook is a silent no-op while the
; file doesn't exist, so the build works either way.
;   0x20001 = SND_FILENAME | SND_ASYNC (play from path, don't block)

!macro NSIS_HOOK_PREINSTALL
  ; e.g. close a running launcher instance before files are replaced
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Subtle completion chime once all files are in place.
  IfFileExists "$INSTDIR\sounds\done.wav" 0 +2
    System::Call 'winmm.dll::PlaySoundW(w "$INSTDIR\sounds\done.wav", p 0, i 0x20001)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
