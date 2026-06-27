// ============================================
// SCRIPTUREQUEST V5 — Learning Path Connector
// This file imports all 66 book files and
// merges them into one learningPath object.

// To add a new book:
//   1. Uncomment the import line for that book
//   2. Uncomment the spread line inside learningPath
// ============================================

// ── THE PENTATEUCH ──────────────────────────
import { genesis }         from './genesis.js';
import { exodus }        from './exodus.js';
import { leviticus }     from './leviticus.js';
import { numbers }       from './numbers.js';
import { deuteronomy }   from './deuteronomy.js';

// ── HISTORICAL BOOKS ────────────────────────
import { joshua }        from './joshua.js';
import { judges }        from './judges.js';
import { ruth }          from './ruth.js';
import { samuel1 }       from './samuel1.js';
import { samuel2 }       from './samuel2.js';
import { kings1 }        from './kings1.js';
import { kings2 }        from './kings2.js';
//import { chronicles1 }   from './chronicles1.js';
//import { chronicles2 }   from './chronicles2.js';
import { ezra }          from './ezra.js';
import { nehemiah }      from './nehemiah.js';
import { esther }        from './esther.js';

// ── WISDOM & POETRY ─────────────────────────
//import { job }           from './job.js';
//import { psalms }        from './psalms.js';
// import { proverbs }      from './proverbs.js';
import { ecclesiastes }  from './ecclesiastes.js';
import { songofsongs }   from './songofsongs.js';

// ── MAJOR PROPHETS ──────────────────────────
// import { isaiah }        from './isaiah.js';
// import { jeremiah }      from './jeremiah.js';
import { lamentations }  from './lamentations.js';
// import { ezekiel }       from './ezekiel.js';
import { daniel }        from './daniel.js';

// ── MINOR PROPHETS ──────────────────────────
import { hosea }         from './hosea.js';
import { joel }          from './joel.js';
import { amos }          from './amos.js';
import { obadiah }       from './obadiah.js';
import { jonah }         from './jonah.js';
import { micah }         from './micah.js';
import { nahum }         from './nahum.js';
import { habakkuk }      from './habakkuk.js';
import { zephaniah }     from './zephaniah.js';
import { haggai }        from './haggai.js';
import { zechariah }     from './zechariah.js';
import { malachi }       from './malachi.js';

// ── THE GOSPELS ─────────────────────────────
import { matthew }       from './matthew.js';
import { mark }          from './mark.js';
// import { luke }          from './luke.js';
import { john }          from './john.js';

// ── ACTS & EPISTLES ─────────────────────────
// import { acts }          from './acts.js';
// import { romans }        from './romans.js';
// import { corinthians1 }  from './corinthians1.js';
// import { corinthians2 }  from './corinthians2.js';
// import { galatians }     from './galatians.js';
// import { ephesians }     from './ephesians.js';
// import { philippians }   from './philippians.js';
// import { colossians }    from './colossians.js';
// import { thessalonians1 } from './thessalonians1.js';
// import { thessalonians2 } from './thessalonians2.js';
// import { timothy1 }      from './timothy1.js';
// import { timothy2 }      from './timothy2.js';
import { titus }         from './titus.js';
import { philemon }      from './philemon.js';
// import { hebrews }       from './hebrews.js';
// import { james }         from './james.js';
// import { peter1 }        from './peter1.js';
// import { peter2 }        from './peter2.js';
// import { john1 }         from './john1.js';
import { john2 }         from './john2.js';
import { john3 }         from './john3.js';
import { jude }          from './jude.js';

// ── REVELATION ──────────────────────────────
// import { revelation }    from './revelation.js';

// ============================================
// MERGED LEARNING PATH
// Uncomment each spread line as the book file
// is created and ready.
// ============================================

export const learningPath = {

  // ── THE PENTATEUCH ──
  ...genesis,
  ...exodus,
  ...leviticus,
  ...numbers,
  ...deuteronomy,

  // ── HISTORICAL BOOKS ──
  ...joshua,
  ...judges,
  ...ruth,
  ...samuel1,
  ...samuel2,
  ...kings1,
  ...kings2,
  //...chronicles1,
  //...chronicles2,
  ...ezra,
  ...nehemiah,
  ...esther,

  // ── WISDOM & POETRY ──
  //...job,
  //...psalms,
  // ...proverbs,
  ...ecclesiastes,
  ...songofsongs,

  // ── MAJOR PROPHETS ──
  // ...isaiah,
  // ...jeremiah,
  ...lamentations,
  // ...ezekiel,
  ...daniel,

  // ── MINOR PROPHETS ──
  ...hosea,
  ...joel,
  ...amos,
  ...obadiah,
  ...jonah,
  ...micah,
  ...nahum,
  ...habakkuk,
  ...zephaniah,
  ...haggai,
  ...zechariah,
  ...malachi,

  // ── THE GOSPELS ──
  ...matthew,
  ...mark,
  // ...luke,
  ...john,

  // ── ACTS & EPISTLES ──
  // ...acts,
  // ...romans,
  // ...corinthians1,
  // ...corinthians2,
  // ...galatians,
  // ...ephesians,
  // ...philippians,
  // ...colossians,
  // ...thessalonians1,
  // ...thessalonians2,
  // ...timothy1,
  // ...timothy2,
  ...titus,
  ...philemon,
  // ...hebrews,
  // ...james,
  // ...peter1,
  // ...peter2,
  // ...john1,
  ...john2,
  ...john3,
  ...jude,

  // ── REVELATION ──
  // ...revelation,

};

export default learningPath;
