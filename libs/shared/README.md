# shared libs

This folder contains lightweight shared helpers for config, logging and common types.

Usage (in services): import via relative path, e.g.

```ts
import { getConfig } from '../../libs/shared/config';
import { logger } from '../../libs/shared/logger';
```

Note: You can later convert this to a proper workspace package (pnpm/yarn workspaces) if desired.
