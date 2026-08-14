// Pulls the business/tech-relevant candidates off the JWCC asset board for visual review.
// Wedding / bridal / social-celebration assets are deliberately excluded.
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = "input/candidates";

// [id, url, category]
const CANDIDATES = [
  // --- aerial & exterior: establishing shots ---
  ["a01-wwd-hero",        "https://wwd.com/wp-content/uploads/2021/10/Jio-World-Centre.jpg", "aerial"],
  ["a02-bkc-garden",      "https://preview.redd.it/bkc-overlooking-jio-garden-v0-fq0z89r5z59g1.jpeg?auto=webp&s=1f75f32073f2b1d3bcc7ab3f4d92a9bcbdf39559", "aerial"],
  ["a03-ht-exterior",     "https://images.hindustantimes.com/img/2024/07/12/1600x900/IMG-20200414-WA0092_1720758743475_1720758776773.jpg", "aerial"],
  ["a04-archinect",       "https://archinect.gumlet.io/uploads/d2/d22d9265ba96acd8804dc0a52526edb3.jpg?fit=crop&auto=compress&format=&enlarge=true&w=1200", "aerial"],
  ["a05-wfm",             "https://wfmmedia.com/wp-content/uploads/2023/04/Jio-World-Centre-A-Place-for-Cultures-and-Communities-1200x675.webp", "aerial"],
  ["a06-mindtrip",        "https://d3fphkxyf5o5bm.cloudfront.net/image-resize/format=webp,w=1200/QwRY54Li1HMwD7oNfq53ph2JHNhQd8apAZwDjFLaLO", "aerial"],

  // --- tvsdesign architectural photography: the premium set ---
  ["b01-tvs-N221",        "https://media.tvsdesign.com/2025/11/01025245/04159_000_N221_1080p.jpg", "arch"],
  ["b02-tvs-N279",        "https://media.tvsdesign.com/2025/11/01025319/04159_000_N279_1080p.jpg", "arch"],
  ["b03-tvs-N275",        "https://media.tvsdesign.com/2025/11/01025308/04159_000_N275_1080p.jpg", "arch"],
  ["b04-tvs-N282",        "https://media.tvsdesign.com/2025/11/01025331/04159_000_N282_medium.jpg", "arch"],
  ["b05-tvs-N226",        "https://media.tvsdesign.com/2025/11/01025256/04159_000_N226_medium.jpg", "arch"],
  ["b06-tvs-N280-vert",   "https://media.tvsdesign.com/2025/11/01025325/04159_000_N280_ipad.jpg", "arch"],

  // --- official venue assets (wedding/bridal entries dropped) ---
  ["c01-concourse",       "https://www.jioworldcentre.com/assets/jwc/concoursejwchomepagekmadesktop.webp", "official"],
  ["c02-ballroom",        "https://www.jioworldcentre.com/assets/jwc/ballroom1920x879.webp", "official"],
  ["c03-conference",      "https://www.jioworldcentre.com/assets/jwc/TCONEVEN863X642Conference.webp", "official"],
  ["c04-events",          "https://www.jioworldcentre.com/assets/jwc/Events863x6421.webp", "official"],
  ["c05-aboutus-vert",    "https://www.jioworldcentre.com/assets/jwc/aboutuskmamobile.webp", "official"],
  ["c06-ourworld",        "https://www.jioworldcentre.com/assets/jwc/ourworldjioworldconventioncentre.webp", "official"],
  ["c07-offices",         "https://www.jioworldcentre.com/assets/jwc/jioworldoffices.webp", "official"],
  ["c08-exhibition",      "https://www.jioworldcentre.com/assets/jwc/exploreourexhibitionhalls.webp", "official"],
  ["c09-prefunction",     "https://www.jioworldcentre.com/assets/jwc/Prefuntion2650x400.webp", "official"],
  ["c10-megadev",         "https://www.jioworldcentre.com/assets/jwc/MegaDevelopment.webp", "official"],

  // --- interiors: halls, concourse, pavilions ---
  ["d01-mf-jio2",         "https://smarthomeexpo.in.messefrankfurt.com/content/dam/messefrankfurt-redaktion/smart-home-expo-mumbai/venue/jio2.jpeg", "interior"],
  ["d02-jd-convhall",     "https://content3.jdmagicbox.com/v2/comp/mumbai/l6/022pxx22.xx22.210930125609.s6l6/catalogue/jio-world-centre-bandra-kurla-complex-bandra-east-mumbai-convention-halls-2btvrk813b.jpg", "interior"],
  ["d03-jd-jasmin",       "https://content.jdmagicbox.com/v2/comp/mumbai/h7/022pxx22.xx22.250602193206.r6h7/catalogue/jasmin-hall-jio-convention-centre-bkc-patthar-nagar-mumbai-banquet-halls-zzz8ye9n1e.jpg", "interior"],
  ["d04-lifestyleasia",   "https://images.lifestyleasia.com/wp-content/uploads/sites/7/2024/07/03134004/Jio-World-Convention-Centre-1-1600x900.jpg", "interior"],
  ["d05-moneycontrol",    "https://images.moneycontrol.com/static-mcnews/2023/10/JWP-24-597x435.jpg?impolicy=website&width=1600&height=900", "interior"],
  ["d06-archidust",       "https://www.archidust.com/blog/wp-content/uploads/2024/12/1-1-1-1024x576.webp", "interior"],
  ["d07-tripura",         "https://www.tripurastarnews.com/wp-content/uploads/2023/10/31-10-2023-Jio-World-Plaza-Opens-In-Mumbai-Setting-The-Bar-For-Top-End-Retail-And-Entertainment-Experiences-In-India.-Pic-3-1024x663.jpg", "interior"],
  ["d08-exhibglobe",      "https://exhibitionglobe.com/business/wp-content/uploads/2024/08/jioworldcentre.jpg", "interior"],
  ["d09-darc",            "https://darcawards.com/wp-content/uploads/2025/01/IES_10_RIL4148.jpg", "interior"],
  ["d10-tl-vert",         "https://images.travelandleisureasia.com/wp-content/uploads/sites/2/2024/07/12170119/Jio-World-Convention-Centre.jpg", "interior"],
  ["d11-tl-hall-vert",    "https://images.travelandleisureasia.com/wp-content/uploads/sites/2/2024/07/12170113/Event-hall.jpg", "interior"],
  ["d12-mf-exhib",        "https://smarthomeexpo.in.messefrankfurt.com/content/dam/messefrankfurt-redaktion/smart-home-expo-mumbai/venue/explore-our-exhibition-halls.jpg", "interior"],
  ["d13-archello",        "https://archello.com/thumbs/images/2022/08/05/sicis-jio-world-centre--mumbai-concert-halls-archello.1659697650.9711.jpg?fit=crop&auto=compress&w=546&h=362", "interior"],

  // --- business-configured setups only (theatre / conference seating) ---
  ["e01-daicec-theatre",  "https://image.wedmegood.com/resized/720X/uploads/member/4765873/1726477945_JIO_DAICEC_2k_A_Theatre.jpg", "setup"],
  ["e02-mb-ballroom",     "https://img.staticmb.com/mbcontent/images/uploads/2023/11/Jio-World-Convention-Centre-Ballroom.jpg", "setup"],

  // --- populated: business events in progress ---
  ["f01-ig-3951",         "https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3951247916302289514", "people"],
  ["f02-ig-3958a",        "https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3958286496316949784", "people"],
  ["f03-ig-3958b",        "https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3958286487165073208", "people"],
  ["f04-fb-752",          "https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=752364530642784", "people"],
  ["f05-fb-673",          "https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=673126224543927", "people"],
  ["f06-fb-748",          "https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=748722044340366", "people"],
  ["f07-ig-3381",         "https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3381414793373657140", "people"],
  ["f08-ig-3647-vert",    "https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3647539052031284873", "people"],
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function extFor(buf, url) {
  const b = Buffer.from(buf.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b.slice(8, 12).toString() === "WEBP") return "webp";
  const m = url.match(/\.(jpe?g|png|webp)(\?|$)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

await mkdir(OUT, { recursive: true });
const report = [];

await Promise.all(CANDIDATES.map(async ([id, url, cat]) => {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "image/avif,image/webp,image/*,*/*;q=0.8", "Referer": "https://www.google.com/" },
      redirect: "follow",
    });
    if (!res.ok) { report.push({ id, cat, ok: false, err: `HTTP ${res.status}` }); return; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3000) { report.push({ id, cat, ok: false, err: `too small (${buf.length}B)` }); return; }
    const file = `${id}.${extFor(buf, url)}`;
    await writeFile(join(OUT, file), buf);
    report.push({ id, cat, ok: true, file, kb: Math.round(buf.length / 1024) });
  } catch (e) {
    report.push({ id, cat, ok: false, err: e.message });
  }
}));

report.sort((a, b) => a.id.localeCompare(b.id));
const ok = report.filter(r => r.ok);
for (const r of report) console.log(r.ok ? `  OK   ${r.id.padEnd(20)} ${String(r.kb).padStart(6)} KB  ${r.file}` : `  FAIL ${r.id.padEnd(20)} ${r.err}`);
console.log(`\n${ok.length}/${report.length} downloaded into ${OUT}`);
