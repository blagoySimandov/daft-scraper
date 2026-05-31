FROM apify/actor-node-puppeteer-chrome

COPY --chown=myuser:myuser package*.json ./

RUN npm --quiet set progress=false \
 && npm install \
 && echo "Installed NPM packages:" \
 && (npm list --all || true) \
 && echo "Node.js version:" \
 && node --version \
 && echo "NPM version:" \
 && npm --version

COPY --chown=myuser:myuser . ./

RUN npm run build \
 && npm prune --production

ENV NODE_ENV=production
