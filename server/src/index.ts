import "dotenv/config";
import { createApp } from "./app";

const port = parseInt(process.env.PORT || "3001", 10);

createApp().listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ashraf's Dental Care API listening on http://localhost:${port}`);
});
