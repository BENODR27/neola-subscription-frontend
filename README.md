# NeoLA Subscription Console

Independent Docker deployment: [package setup and environment configuration](DEPLOYMENT.md).

Independent Angular frontend for platform operators and customer owners. Related feature templates and TypeScript stay together; `control.facade.ts` owns typed API calls and server-side pagination. ERP employee authentication stays in the ERP.

Run `npm ci` and `npm start`; open http://127.0.0.1:4300 with the API running on 7020. `npm run validate` builds with strict TypeScript/template checks. See [setup, Docker and cutover](../docs/SUBSCRIPTION-MANAGEMENT.md).
# neola-subscription-frontend
