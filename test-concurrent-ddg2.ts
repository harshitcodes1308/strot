import { searchDuckDuckGo } from "./src/lib/ddg-search";

async function run() {
  const p1 = searchDuckDuckGo("site:linkedin.com/company/ \"gym in delhi\"", 5);
  const p2 = searchDuckDuckGo("site:instagram.com gym in delhi", 5);
  const p3 = searchDuckDuckGo("gym in delhi", 5);

  const [res1, res2, res3] = await Promise.all([p1, p2, p3]);
  console.log("LinkedIn:", res1.length);
  console.log("Instagram:", res2.length);
  console.log("Website:", res3.length);
}
run();
