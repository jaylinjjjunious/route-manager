# Restore Point

This is the current/latest All in One 667 app folder:

```text
C:\Users\teren\OneDrive\Documents\Route Manager\route-optimizer-app
```

Current checkpoint tag:

```sh
latest-safe-app-baseline
```

To return this app to the saved version later:

```sh
git restore .
git checkout latest-safe-app-baseline
```

To keep editing after restoring, create a recovery branch:

```sh
git switch -c recovery-from-latest-safe-app-baseline latest-safe-app-baseline
```
