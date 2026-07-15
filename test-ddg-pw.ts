import { searchDuckDuckGo } from './src/lib/ddg-search';

async function run() {
  const res = await searchDuckDuckGo('site:linkedin.com/company/ stepoutcafe');
  console.log(res);
}
run();
