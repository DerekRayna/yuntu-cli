import { getVersions } from './versionUtils.js';

const info = getVersions('create-vite');

info.then((res) => {console.log(res)})