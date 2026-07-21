# Deployment Vault + Shadow Archive Override

This page-level specification overrides the softer bento defaults in `MASTER.md`.

## Visual doctrine

- Background: `#050505`
- Primary surface: translucent `#110D17`
- Active accent: `#7B2CBF`
- Primary text: `#FFFFFF`
- Secondary text: `#9B8EA6` or lighter to preserve dark-mode readability
- Geometry: asymmetric clipped corners, sharp separators, thin luminous borders
- Imagery: dark landscapes with a strong black gradient scrim behind text

## Interaction doctrine

- Keep controls at least 44px high.
- Preserve visible keyboard focus on cards, selects, toggles and launch controls.
- Use semantic buttons, labels, fieldsets and ARIA pressed/switch states.
- Motion communicates selection and hierarchy in 180–300ms and respects reduced motion.
- The profile grid scrolls independently while the selected deployment remains readable.
- Do not rely on purple, green or amber alone; pair every state color with text or an icon.

## Information architecture

- Deployment Vault: filterable profile grid on the left; persistent selected-profile detail on the right.
- Shadow Archive: explicit Modpacks, Mods and Shaders categories with source, sort, category, version and loader filters.
- Loading and launch operations always expose disabled, pending, success or error feedback.
