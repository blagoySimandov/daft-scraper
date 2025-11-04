export function writeObjectToFile(obj: any, filePath: string) {
  const fs = require("fs");
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}
