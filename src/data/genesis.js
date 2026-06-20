// ============================================
// SCRIPTUREQUEST V5 — Learning Path Content
// Phase 1: Content Generation
// 
// Structure: lessonId → full lesson object
// Sections:
//   GEN = Genesis (Section 1 - The Pentateuch)
//   EXO = Exodus  (Section 1 - The Pentateuch)
//   ... etc
// ============================================

export const genesis = {

  // ── SECTION 1: THE PENTATEUCH ──────────────
  // ── UNIT: GENESIS ──────────────────────────
  "GEN-01-A": {
  "lessonId": "GEN-01-A",
  "lessonTitle": "The First Four Days",
  "passageRef": "Genesis 1:1-19",
  "studyCard": {
    "title": "When God Spoke Order Into Chaos",
    "hook": "The opening verse of your Bible may not be describing the very beginning of time — and that changes everything about what creation actually means.",
    "teaching": "The Hebrew phrase that opens Scripture — 'Bereshit bara Elohim' — has been debated by scholars for centuries. The word 'bara,' used exclusively in the Old Testament with God as its subject, doesn't simply mean 'to make.' It means to create something qualitatively new, to bring into existence a distinction that did not exist before. What God is doing in Genesis 1 is not merely manufacturing raw material — He is imposing order, boundary, and meaning onto a formless, dark, watery void. The ancient Hebrew audience would have understood 'tohu wabohu' — 'formless and empty' — as a state of chaos, not nothingness. God's first act is not production; it is the conquest of disorder.\n\nThe structure of Days 1 through 4 is not random — it follows a precise literary architecture that most readers walk right past. Days 1, 2, and 3 establish realms: light, sky-and-sea, and land. Days 4, 5, and 6 then fill those realms with rulers and inhabitants. Day 1 produces light; Day 4 produces the luminaries that govern it. The sun, moon, and stars don't appear until Day 4 — which means the 'light' of Day 1 is explicitly independent of any astronomical body. This is intentional and theologically loaded: light is not the sun. Light is a creation of God that precedes and transcends any physical source.\n\nYou should also notice what Genesis 1 is doing culturally. Israel's neighbours — the Babylonians, Egyptians, Canaanites — all worshipped the sun, moon, and stars as deities. Marduk, Ra, Baal. Genesis 1 demotes these 'gods' to objects: the sun is called 'the greater light' and the moon 'the lesser light.' They are not even named. They are lamps God hung in a sky He already made. To an Israelite hearing this text for the first time, this was not quiet theology — it was a direct polemic against the religious world around them.\n\nThe repeated phrase 'and God saw that it was good' carries more weight than it first appears. The Hebrew word 'tov' doesn't mean morally perfect — it means functional, fit for purpose, beautiful in its design. Each declaration of 'tov' marks the completion of a stage. But notice that Day 2 — the separation of waters above and below — receives no 'it was good.' Scholars have long observed this absence. The waters remain unresolved; they will need the dry land of Day 3 to complete the work. Even the rhythm of approval reveals the architecture.\n\nConnect this passage to John 1:1-3, and you see the New Testament authors understood Genesis cosmically. 'In the beginning was the Word' mirrors 'In the beginning God created' — and 'through him all things were made' places Christ as the agent of every act described in Genesis 1. The speaking God of Genesis is the incarnate Word of John. Creation is not backstory. It is the opening movement of a single, unified story that ends in Revelation 21.",
    "keyVerse": "In the beginning God created the heavens and the earth. — Genesis 1:1 (NIV)",
    "memoryPrompt": "God made light on Day 1 — but didn't make the sun until Day 4, because light was never just about the sun.",
    "challengeFact": "Day 2 is the only day of creation that does not receive the declaration 'and God saw that it was good' — a deliberate omission that signals the work of separating the waters was considered incomplete until the dry land appeared on Day 3."
  },
  "questions": [
    {
      "id": "GEN-01-A-Q1",
      "difficultyLevel": "HARD",
      "questionType": "HOW_MANY",
      "question": "How many times does the phrase 'and God saw that it was good' appear within Genesis 1:1-19?",
      "options": ["Three times", "Four times", "Five times", "Six times"],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:4, 1:10, 1:12"
    },
    {
      "id": "GEN-01-A-Q2",
      "difficultyLevel": "HARD",
      "questionType": "WHAT",
      "question": "According to Genesis 1:14, the lights in the vault of the sky were given to serve as signs for which of the following?",
      "options": ["Seasons, days and years", "Worship, feasts and harvests", "Planting, rain and drought", "Night, morning and noon"],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:14"
    },
    {
      "id": "GEN-01-A-Q3",
      "difficultyLevel": "VERY_HARD",
      "questionType": "WHEN",
      "question": "On which day of creation did God first introduce the concept of separation between two existing things?",
      "options": ["Day 1", "Day 2", "Day 3", "Day 4"],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:4"
    },
    {
      "id": "GEN-01-A-Q4",
      "difficultyLevel": "VERY_HARD",
      "questionType": "WHO",
      "question": "What name does Genesis 1:1-19 give to the expanse God made to separate the waters on Day 2?",
      "options": ["The heavens", "The vault", "The sky", "The firmament"],
      "correctAnswer": 1,
      "verseReference": "Genesis 1:7-8"
    },
    {
      "id": "GEN-01-A-Q5",
      "difficultyLevel": "VERY_HARD",
      "questionType": "SEQUENCE",
      "question": "On Day 3, God performed two distinct creative acts. In what order did they occur?",
      "options": [
        "Dry land appeared, then vegetation was produced",
        "Vegetation was produced, then dry land appeared",
        "Seas were named, then dry land was named",
        "Trees were made first, then grass and seed-bearing plants"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:9-12"
    },
    {
      "id": "GEN-01-A-Q6",
      "difficultyLevel": "EXPERT",
      "questionType": "ABSENCE",
      "question": "Which of the following phrases, used to close all other creation days in Genesis 1:1-19, is notably absent from the account of Day 2?",
      "options": [
        "'And God saw that it was good'",
        "'And there was evening and there was morning'",
        "'And it was so'",
        "'God called it'"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:6-8"
    },
    {
      "id": "GEN-01-A-Q7",
      "difficultyLevel": "EXPERT",
      "questionType": "EXACT_WORDING",
      "question": "In Genesis 1:16 (NIV), what exact phrase does the text use to refer to the sun — without actually using the word 'sun'?",
      "options": [
        "The greater light",
        "The ruling light",
        "The first light",
        "The greater luminary"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:16"
    }
  ]
},

    "GEN-01-B": {
  "lessonId": "GEN-01-B",
  "lessonTitle": "Life, Rest, and the Seventh Day",
  "passageRef": "Genesis 1:20-2:3",
  "studyCard": {
    "title": "The Day God Stopped — and Why That Changes Everything",
    "hook": "God didn't rest on the seventh day because He was tired — He rested because He was finished, and that distinction reshapes how you understand work, worship, and time itself.",
    "teaching": "Days 5 and 6 complete the filling of the realms established in Days 1 through 3. The sea and sky — separated on Day 2 — now receive their inhabitants: fish and birds on Day 5. The land — formed on Day 3 — receives livestock, creatures, and finally humanity on Day 6. But before humanity arrives, something new appears in the narrative: for the first time, God blesses His creatures. 'Be fruitful and increase in number' is not a command in the legal sense — it is a benediction, a release of divine power into living things. This is the first blessing in the Bible, and it falls on creatures before it falls on humans.\n\nWhen humanity arrives in verses 26-27, the narrative shifts register entirely. For the first time, God deliberates before creating: 'Let us make mankind.' The plural here — 'let us' — has generated centuries of theological discussion. Jewish interpreters understood it as a divine council or the majestic plural of a king. Christian theologians have read it as the first whisper of Trinitarian complexity in Scripture. Whatever your reading, the grammar marks humans as categorically different from everything else made in this passage. Everything else was spoken into existence. Humanity is spoken about — in council — before being made.\n\nThe phrase 'in our image, in our likeness' carries enormous weight. The Hebrew 'tselem' — image — was used in the ancient Near East to describe a king's statue erected in a conquered territory. The statue bore the king's image and represented his authority in places he could not physically be. To be made in God's image is to be His representative on earth — His statue, bearing His authority over creation. This is not primarily about intelligence or morality; it is about commission and delegated rule.\n\nDay 7 stands apart from every other day in the account. It is the only day that receives a threefold divine action: God rested, God blessed, and God made it holy. No other day is blessed or sanctified. The Hebrew 'shabbat' — from which we get 'Sabbath' — means simply 'to cease, to stop.' But the cessation of God is not inactivity; it is the declaration that the work is complete and good. Exodus 20:8-11 will later anchor the human Sabbath command directly to this moment, making Israel's weekly rest a participation in God's own pattern. Rest becomes a theological act, not merely a biological one.\n\nNotice also what Day 7 lacks: the text never says 'and there was evening and there was morning, the seventh day.' Every other day is closed with this formula. The seventh day has no evening — a detail the author of Hebrews picks up in Hebrews 4:9-10, arguing that God's Sabbath rest is still ongoing, still open, still available to enter. The open-ended seventh day is not an accident of style. It is a theological door left deliberately ajar.",
    "keyVerse": "God blessed the seventh day and made it holy, because on it he rested from all the work of creating that he had done. — Genesis 2:3 (NIV)",
    "memoryPrompt": "The seventh day never closes — there's no 'evening and morning' — because God's rest is still an open invitation.",
    "challengeFact": "Genesis 2:3 records three distinct actions God performed on the seventh day — He rested, He blessed it, and He made it holy — making it the only day in the entire creation account to receive all three: cessation, benediction, and sanctification."
  },
  "questions": [
    {
      "id": "GEN-01-B-Q1",
      "difficultyLevel": "HARD",
      "questionType": "WHAT",
      "question": "What specific blessing did God pronounce over the creatures created on Day 5, according to Genesis 1:22?",
      "options": [
        "Be fruitful and increase in number and fill the water and the air",
        "Be fruitful and multiply and fill the earth",
        "Increase in number and rule over every living thing",
        "Fill the earth and subdue every creature"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:22"
    },
    {
      "id": "GEN-01-B-Q2",
      "difficultyLevel": "HARD",
      "questionType": "HOW_MANY",
      "question": "How many categories of land creatures does Genesis 1:24 list as being brought forth on Day 6?",
      "options": ["Two", "Three", "Four", "Five"],
      "correctAnswer": 1,
      "verseReference": "Genesis 1:24"
    },
    {
      "id": "GEN-01-B-Q3",
      "difficultyLevel": "VERY_HARD",
      "questionType": "WHO",
      "question": "According to Genesis 1:29, what food did God specifically give to human beings?",
      "options": [
        "Every seed-bearing plant and every tree that has fruit with seed in it",
        "Every living creature that moves and every green plant",
        "The fruit of every tree in the garden and grain from the fields",
        "Every green plant and every creature of the sea"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:29"
    },
    {
      "id": "GEN-01-B-Q4",
      "difficultyLevel": "VERY_HARD",
      "questionType": "WHERE",
      "question": "Over what specific domains did God grant humanity dominion in Genesis 1:26?",
      "options": [
        "Fish of the sea, birds of the sky, livestock, all wild animals, and all creatures that move along the ground",
        "Fish of the sea, birds of the sky, all living creatures, and the whole earth",
        "All creatures on the earth, in the sea, and every plant and tree",
        "The earth, the sea, the sky, and every living creature therein"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:26"
    },
    {
      "id": "GEN-01-B-Q5",
      "difficultyLevel": "VERY_HARD",
      "questionType": "SEQUENCE",
      "question": "In Genesis 2:2-3, in what sequence does the text describe God's three actions regarding the seventh day?",
      "options": [
        "He rested, then blessed it, then made it holy",
        "He made it holy, then blessed it, then rested",
        "He blessed it, then rested, then made it holy",
        "He rested, then made it holy, then blessed it"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 2:2-3"
    },
    {
      "id": "GEN-01-B-Q6",
      "difficultyLevel": "EXPERT",
      "questionType": "ABSENCE",
      "question": "The closing formula 'and there was evening, and there was morning' appears at the end of Days 1 through 6. What is true of Day 7 in Genesis 2:1-3?",
      "options": [
        "The seventh day receives no closing evening-and-morning formula",
        "The seventh day closes with evening and morning like all other days",
        "The seventh day closes with morning only, omitting the evening",
        "The seventh day closes with the formula but adds 'and it was very good'"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 2:1-3"
    },
    {
      "id": "GEN-01-B-Q7",
      "difficultyLevel": "EXPERT",
      "questionType": "EXACT_WORDING",
      "question": "Genesis 1:31 records God's evaluation of everything He had made. How does the NIV render His assessment — and how does it differ from every previous evaluation in chapter 1?",
      "options": [
        "God saw that it was 'very good' — the only day where 'very' is added",
        "God saw that it was 'exceedingly good' — unique wording used only on Day 6",
        "God saw that it was 'good and perfect' — first use of 'perfect' in Scripture",
        "God saw that it was 'altogether good' — reflecting the completion of all days"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 1:31"
    }
  ]
},

"GEN-02-A": {
  "lessonId": "GEN-02-A",
  "lessonTitle": "The Garden and the Man",
  "passageRef": "Genesis 2:4-25",
  "studyCard": {
    "title": "Dust, Breath, and the God Who Gets Close",
    "hook": "Genesis 2 is not a second creation account that contradicts chapter 1 — it is a deliberate zoom into the one moment chapter 1 treated in two verses, and what it reveals about God is almost jarring.",
    "teaching": "The shift from Genesis 1 to Genesis 2 is a shift in literary camera angle. Chapter 1 views creation from a cosmic distance — ordered, majestic, structured. Chapter 2 drops the lens to ground level. The name for God changes too: from 'Elohim' — the transcendent Creator — to 'YHWH Elohim,' the covenant name that will define God's personal relationship with Israel. This is not a different source document bolted onto chapter 1, as some critical scholars suggest. It is the same narrative deliberately narrowing its focus: now we are inside the story, at the moment that matters most.\n\nThe creation of the man in verse 7 is the most intimate image of God in all of Genesis 1-2. Elohim spoke and worlds appeared. But here, YHWH Elohim gets His hands in the dirt. He forms the man from the dust of the ground — the Hebrew 'yatsar' is the word for a potter shaping clay — and then breathes into his nostrils. This is the only time in Scripture that God breathes directly into a human being. The word for breath here — 'nishmat chayyim' — is the same breath associated elsewhere with God's own life-force. The man becomes a 'living being' ('nephesh chayyah') at this moment, not before. Life, in Genesis 2, is not biology — it is the breath of God.\n\nThe garden God plants in Eden is described with four rivers flowing out from it — the Pishon, Gihon, Tigris, and Euphrates. Two of these rivers are identifiable today; two are not. But the ancient audience would have understood the garden as the source point of the world's water system — the navel of the earth, the place where heaven and ground most visibly meet. The garden is not merely a pleasant environment. It is the first temple. The language of tending and keeping used in verse 15 — 'abad' and 'shamar' — are later used exclusively for priestly service in the tabernacle. Adam is the first priest, and Eden is the first sanctuary.\n\nThe naming of the animals in verses 19-20 is a royal act, not a zoological exercise. In the ancient Near East, to name something was to assert authority over it — which is precisely what was granted to humanity in chapter 1. But the naming sequence ends with a discovery: 'for Adam no suitable helper was found.' This is the only moment in the entire creation account where something is declared not good — 'lo tov.' The incompleteness is intentional. It sets the stage for what is about to happen.\n\nThe creation of the woman from Adam's 'tsela' — most often translated 'rib' — is more accurately rendered 'side' in many scholarly discussions. The same Hebrew word is used for the side chambers of the temple in Ezekiel. What God takes from Adam is not a spare part; it is a portion of his very structure. When Adam sees the woman and says 'bone of my bones and flesh of my flesh,' this is the first human speech in the Bible — and it is a poem. The first words a human being speaks are words of recognition, wonder, and belonging.",
    "keyVerse": "The Lord God formed a man from the dust of the ground and breathed into his nostrils the breath of life, and the man became a living being. — Genesis 2:7 (NIV)",
    "memoryPrompt": "Adam's first words are a poem — the first human speech in the Bible is an act of wonder, not a command.",
    "challengeFact": "The Hebrew verbs used for Adam's work in the garden — 'abad' (to tend/serve) and 'shamar' (to keep/guard) — are the exact same verbs used throughout Exodus and Numbers exclusively for the priestly service of the Levites in the tabernacle, making Eden the original sanctuary and Adam the original priest."
  },
  "questions": [
    {
      "id": "GEN-02-A-Q1",
      "difficultyLevel": "HARD",
      "questionType": "HOW_MANY",
      "question": "How many rivers does Genesis 2 say flowed from the garden of Eden?",
      "options": ["Two", "Three", "Four", "Seven"],
      "correctAnswer": 2,
      "verseReference": "Genesis 2:10-14"
    },
    {
      "id": "GEN-02-A-Q2",
      "difficultyLevel": "HARD",
      "questionType": "WHERE",
      "question": "According to Genesis 2:12, what two precious materials were found in the land of Havilah?",
      "options": [
        "Gold and bdellium and onyx stone",
        "Silver and gold and precious stones",
        "Gold and lapis lazuli",
        "Onyx and jasper"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 2:12"
    },
    {
      "id": "GEN-02-A-Q3",
      "difficultyLevel": "VERY_HARD",
      "questionType": "WHAT",
      "question": "In Genesis 2:17, God's command about the tree of the knowledge of good and evil included a specific consequence. What exact consequence is stated?",
      "options": [
        "When you eat from it you will certainly die",
        "You will be banished from the garden",
        "You will lose the breath of life",
        "You will know suffering and toil"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 2:17"
    },
    {
      "id": "GEN-02-A-Q4",
      "difficultyLevel": "VERY_HARD",
      "questionType": "SEQUENCE",
      "question": "In Genesis 2:19-23, what is the correct sequence of events in the creation of the woman?",
      "options": [
        "Animals formed → Adam names them → no helper found → deep sleep → rib taken → woman brought to Adam → Adam speaks",
        "Deep sleep → rib taken → animals named → woman presented → Adam speaks",
        "Animals formed → deep sleep → rib taken → woman made → Adam names the animals → Adam speaks",
        "No helper found → animals formed → Adam names them → deep sleep → woman presented"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 2:19-23"
    },
    {
      "id": "GEN-02-A-Q5",
      "difficultyLevel": "VERY_HARD",
      "questionType": "WHEN",
      "question": "According to Genesis 2:25, what was the condition of the man and his wife at the close of the chapter?",
      "options": [
        "Both naked and felt no shame",
        "Both clothed with garments of light",
        "Both naked but unaware of each other",
        "Both at peace with every creature in the garden"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 2:25"
    },
    {
      "id": "GEN-02-A-Q6",
      "difficultyLevel": "EXPERT",
      "questionType": "ABSENCE",
      "question": "Genesis 2:16-17 records God giving the man permission regarding the garden's trees. Which of the following does the text NOT explicitly include in God's command?",
      "options": [
        "Any instruction about the tree of life",
        "Permission to eat from every tree in the garden",
        "A prohibition against eating from the tree of the knowledge of good and evil",
        "A warning that eating the forbidden fruit would result in death"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 2:16-17"
    },
    {
      "id": "GEN-02-A-Q7",
      "difficultyLevel": "EXPERT",
      "questionType": "EXACT_WORDING",
      "question": "In Genesis 2:23 (NIV), Adam gives the woman her name at this point. What word does Adam use in naming her, and what reason does he give?",
      "options": [
        "He calls her 'woman' because she was taken out of man",
        "He calls her 'Eve' because she would be the mother of all living",
        "He calls her 'helper' because she was made to complement him",
        "He calls her 'beloved' because she was bone of his bone"
      ],
      "correctAnswer": 0,
      "verseReference": "Genesis 2:23"
    }
  ]
},

  "GEN-02-B": {
    "lessonId": "GEN-02-B",
    "lessonTitle": "The Garden and the Man",
    "passageRef": "Genesis 2:4-25",
    "studyCard": {
      "title": "The First Marriage and the Mystery of One Flesh",
      "hook": "The word translated 'rib' in Genesis 2 has never actually meant rib — and what it really means reframes the entire story of the first marriage.",
      "teaching": "When God causes a deep sleep to fall on Adam in Genesis 2:21, the Hebrew word used is 'tardemah' — the same word used in Genesis 15:12 when God causes Abraham to fall into a deep sleep before ratifying the covenant. This is not incidental. Sleep in these narratives is the moment God does something unilateral, something the human cannot participate in or earn. The woman is not a product of Adam's effort or request — she is a gift given while he is entirely passive. This is the first theological statement about marriage: it is a work of God, not a human construction.\n\nThe Hebrew word 'tsela,' translated 'rib' in most English Bibles, appears 41 times in the Old Testament. In every other occurrence outside Genesis 2, it means 'side' — the side of the ark of the covenant, the side chambers of the temple, the side of a hill. Many Hebrew scholars argue strongly that what God takes from Adam is not a single bone but an entire side of his being. If so, the creation of the woman is not the addition of a companion — it is the differentiation of a single human being into two. Adam before Eve may have been, in some sense, an undivided whole that became two distinct persons.\n\nAdam's declaration in verse 23 is the first recorded human speech in the Bible, and it arrives as poetry. The rhythm, the parallelism, the cry of recognition — 'bone of my bones and flesh of my flesh' — are the marks of Hebrew verse. The first words a human being speaks are not a command, not a question, not a complaint. They are a love poem. This matters profoundly for how you understand the image of God: the first thing the image-bearer does with language is use it to express wonder and belonging.\n\nVerse 24 introduces a principle that breaks entirely with ancient Near Eastern social norms. 'A man leaves his father and mother and is united to his wife.' In virtually every ancient culture, the woman left her family and was absorbed into the man's household and clan. Here the text reverses the expectation — the man is the one who leaves. Jesus will quote this verse directly in Matthew 19:5, grounding His entire teaching on divorce in this one passage from Eden. The standard for marriage was set before the Fall — which means it reflects design, not damage.\n\nThe closing verse — 'both naked and felt no shame' — is more than an observation about innocence. Nakedness in the Old Testament is consistently a metaphor for vulnerability and the absence of pretense. What verse 25 describes is a relationship of complete transparency with no fear of exploitation. There is nothing hidden, nothing performed, nothing defended. This is what the image of God in community looks like before sin fractures it — and it is precisely what Genesis 3 will destroy in the very next scene.",
      "keyVerse": "That is why a man leaves his father and mother and is united to his wife, and they become one flesh. — Genesis 2:24 (NIV)",
      "memoryPrompt": "The first human words in the Bible are a love poem — and the standard for marriage was set before sin ever entered.",
      "challengeFact": "The Hebrew word 'tsela' translated 'rib' in Genesis 2:21-22 appears 40 other times in the Old Testament and is never once translated 'rib' — it always means 'side,' suggesting God may have taken an entire side of Adam's being rather than a single bone."
    },
    "questions": [
      {
        "id": "GEN-02-B-Q1",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "What material did God use to close up Adam's flesh after taking the rib, according to Genesis 2:21?",
        "options": ["Clay from the ground", "Flesh", "Skin from an animal", "Dust as before"],
        "correctAnswer": 1,
        "verseReference": "Genesis 2:21"
      },
      {
        "id": "GEN-02-B-Q2",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "Genesis 2:10 states that the river watering the garden separated into how many headwaters after leaving Eden?",
        "options": ["Two", "Three", "Six", "Four"],
        "correctAnswer": 3,
        "verseReference": "Genesis 2:10"
      },
      {
        "id": "GEN-02-B-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 2:13, the second river — the Gihon — winds through the entire land of which territory?",
        "options": ["Havilah", "Assyria", "Cush", "Eden"],
        "correctAnswer": 2,
        "verseReference": "Genesis 2:13"
      },
      {
        "id": "GEN-02-B-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 2:18 (NIV), God identifies something that is 'not good.' What is His exact diagnosis of the problem?",
        "options": [
          "It is not good for the man to tend the garden alone",
          "It is not good for the man to name the animals alone",
          "It is not good for the man to be without purpose",
          "It is not good for the man to be alone"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 2:18"
      },
      {
        "id": "GEN-02-B-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "SEQUENCE",
        "question": "In Genesis 2:21-23, what is the precise sequence of God's actions and Adam's response in the creation of the woman?",
        "options": [
          "God took the rib → closed with flesh → built the woman → brought her to Adam → Adam named her",
          "God caused deep sleep → took the rib → built the woman → brought her to Adam → Adam declared bone of his bones",
          "God caused deep sleep → Adam named all creatures → God took the rib → Adam declared bone of his bones",
          "God built the woman → caused deep sleep → took the rib → Adam declared she was bone of his bones"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 2:21-23"
      },
      {
        "id": "GEN-02-B-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 2:16-17 records God's instructions to Adam about the trees of the garden. Which of the following is entirely absent from God's stated words in those two verses?",
        "options": [
          "Permission to eat from every other tree in the garden",
          "Any instruction to Adam about the tree of life specifically",
          "A prohibition against eating from the tree of the knowledge of good and evil",
          "A warning that eating the forbidden fruit would result in death"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 2:16-17"
      },
      {
        "id": "GEN-02-B-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "WHO",
        "question": "According to Genesis 2:19, what was God's stated purpose in forming the animals and birds and bringing them to Adam?",
        "options": [
          "To demonstrate God's creative power to Adam",
          "To populate the garden Adam was commissioned to tend",
          "To see what Adam would name them",
          "To find among them a helper suitable for Adam"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 2:19"
      }
    ]
  },

  "GEN-03-A": {
    "lessonId": "GEN-03-A",
    "lessonTitle": "The Fall",
    "passageRef": "Genesis 3:1-24",
    "studyCard": {
      "title": "The Day the Ground Changed",
      "hook": "The serpent's first recorded words in Genesis 3 are not a lie — they are a question, and the fact that Eve engages with it is already the beginning of the end.",
      "teaching": "The serpent is introduced in Genesis 3:1 with one Hebrew word that carries everything: 'arum' — crafty, shrewd, subtle. Crucially, this is the same root word used in Proverbs to describe wisdom. The serpent is not presented as obviously monstrous. He is presented as dangerously intelligent. His opening move is not a command and not a temptation in the blunt sense — it is a question: 'Did God really say...?' He doesn't deny God's word outright; he destabilises it. He introduces the possibility that what God said might mean something other than what it plainly appears to mean. Doubt doesn't require a lie. It only requires a question placed at the right moment.\n\nEve's response in verse 3 already reveals that something has shifted. God's command in Genesis 2:17 was about one tree. Eve adds a prohibition God never stated: 'you must not touch it.' Whether she misremembered, or whether Adam passed on a cautious amplification of the rule, the text does not say. But she is already working from a version of God's word that is slightly wrong. The serpent immediately exploits the gap. 'You will not certainly die' — a direct contradiction of God's stated consequence, reframed as God's jealous concealment of something good.\n\nThe sequence in verse 6 is one of the most theologically loaded sentences in all of Scripture. Eve saw the fruit was good for food — appetite. She saw it was pleasing to the eye — aesthetic desire. She saw it was desirable for gaining wisdom — intellectual ambition. And then: 'she also gave some to her husband, who was with her.' Four words that shift everything — 'who was with her.' Adam was present the entire time. He did not intervene. His sin is not ignorance; it is silence and passive compliance.\n\nThe consequences God pronounces in verses 14-19 follow a precise reverse order of the temptation: serpent first, then woman, then man. Notice that God addresses the serpent and the man in direct second person but speaks about the woman in third person to Adam before turning to address her. This subtle grammatical shift marks the relational fracture that has just occurred. And the curses are not arbitrary — each one strikes the domain in which the sin was committed. The woman's pain centres on life-giving; the man's on his work and the ground he came from.\n\nThe chapter ends with an act that is easy to overlook entirely: 'The Lord God made garments of skin for Adam and his wife and clothed them.' Before the expulsion, God covers their shame. The garments required the death of an animal — the first death in all of Scripture, performed by God Himself, to clothe the people He had just judged. It is a small moment that casts a long shadow forward through the entire sacrificial system of Leviticus, and all the way to the cross.",
      "keyVerse": "And I will put enmity between you and the woman, and between your offspring and hers; he will crush your head, and you will strike his heel. — Genesis 3:15 (NIV)",
      "memoryPrompt": "Adam wasn't tricked — he was standing right there, silent, and that silence was his sin.",
      "challengeFact": "Genesis 3:6 contains four words most readers miss entirely: 'who was with her' — meaning Adam stood present and silent throughout the serpent's entire temptation of Eve before he took and ate the fruit himself."
    },
    "questions": [
      {
        "id": "GEN-03-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "How many distinct elements of punishment does God pronounce specifically on the serpent in Genesis 3:14-15?",
        "options": ["Four", "Five", "Two", "Three"],
        "correctAnswer": 3,
        "verseReference": "Genesis 3:14-15"
      },
      {
        "id": "GEN-03-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 3:1 (NIV), how is the serpent described in its very first characterisation in the text?",
        "options": [
          "More devious than any creature the Lord had placed in the garden",
          "More cunning than every beast God had formed from the ground",
          "More crafty than any of the wild animals the Lord God had made",
          "More subtle than all the living things God had breathed life into"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 3:1"
      },
      {
        "id": "GEN-03-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "SEQUENCE",
        "question": "In what order does God address the guilty parties when pronouncing judgement in Genesis 3:14-19?",
        "options": [
          "Man, then serpent, then woman",
          "Serpent, then man, then woman",
          "Woman, then serpent, then man",
          "Serpent, then woman, then man"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 3:14-19"
      },
      {
        "id": "GEN-03-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 3:20, Adam named his wife Eve at a specific moment in the narrative. What reason does the text give for this name?",
        "options": [
          "Because she was the first woman formed by God's own hands",
          "Because she had been taken from the side of the man",
          "Because she would suffer pain as a reminder of the Fall",
          "Because she would become the mother of all the living"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 3:20"
      },
      {
        "id": "GEN-03-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHAT",
        "question": "Genesis 3:6 gives three reasons Eve found the fruit compelling before she took it. Which of the following correctly lists all three as stated in the text?",
        "options": [
          "Good for food, desirable for wisdom, and able to make her equal to God",
          "Pleasing to look at, good for strength, and desirable for ruling the earth",
          "Good for food, pleasing to the eye, and desirable for gaining wisdom",
          "Desirable for knowledge, sweet to the taste, and pleasing to the mind"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 3:6"
      },
      {
        "id": "GEN-03-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "WHERE",
        "question": "According to Genesis 3:24, precisely where did God station the cherubim and the flaming sword after expelling Adam and Eve?",
        "options": [
          "At every entrance to the garden of Eden, surrounding it entirely",
          "Before the tree of the knowledge of good and evil",
          "On the east side of the garden of Eden, to guard the way to the tree of life",
          "At the gates of Eden, facing the direction of the man's exile"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 3:24"
      },
      {
        "id": "GEN-03-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "In Genesis 3:6, the text describes Eve's assessment of the fruit before she ate. Which of the following motivations does the text specifically NOT attribute to her?",
        "options": [
          "That it was good for food",
          "That it would make her equal to God in power",
          "That it was pleasing to the eye",
          "That it was desirable for gaining wisdom"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 3:6"
      }
    ]
  },

  "GEN-03-B": {
    "lessonId": "GEN-03-B",
    "lessonTitle": "The Fall",
    "passageRef": "Genesis 3:1-24",
    "studyCard": {
      "title": "Cursed Ground and Covered Shame",
      "hook": "Before God expelled Adam and Eve from the garden, He made them clothing — and the animal that died to provide it is the first death Scripture records.",
      "teaching": "The curse on the ground in Genesis 3:17-19 is more than agricultural inconvenience. It is a statement about the relationship between humanity and creation at the deepest level. Adam was formed from the ground — 'adamah' is the Hebrew word from which 'adam' derives. His identity is bound to the earth. When the ground is cursed, it is as though Adam's own nature is placed in permanent tension with itself. He will work the ground, but the ground will resist. He will eat from it, but only through painful toil. And ultimately he will return to it: 'for dust you are, and to dust you shall return.' Death here is not just biological — it is a return to origin without the breath of God.\n\nThe three curses of Genesis 3 each target the domain of the sinner's primary calling. The serpent, who used the created order to deceive, is permanently consigned to it — belly in the dust, lowest of creatures. The woman, whose domain includes life-giving and intimate relationship, suffers most acutely there. The man, commissioned to work and keep the earth, finds that domain turned against him. There is a surgical precision to these consequences that most casual readers miss entirely. God does not punish randomly. He allows the consequences to grow from the act itself.\n\nGenesis 3:15 is one of the most examined verses in all of Scripture. Theologians have named it the Protoevangelium — the first gospel. 'He will crush your head, and you will strike his heel.' The language of enmity between the woman's offspring and the serpent's runs as an undercurrent through the entire biblical narrative: Abel and Cain, Isaac and Ishmael, Israel and her enemies, and ultimately Christ and the powers of darkness. The crushing of the head is fatal; the striking of the heel is painful but survivable. The verse is not a promise of easy victory — it is a guarantee that victory will come, but at cost.\n\nThe expulsion from the garden in verses 22-24 is often read as pure punishment. But read verse 22 carefully: 'He must not be allowed to reach out his hand and take also from the tree of life and eat, and live forever.' This is mercy embedded within judgment. To live forever in a fallen, broken state — permanently alienated from God, enslaved to sin — would be a horror far worse than physical death. The closure of access to the tree of life prevents an eternal, unredeemable existence in brokenness. Physical death, as devastating as it is, creates the very possibility of redemption. It is a door, not a wall.\n\nLook one final time at verse 21: 'The Lord God made garments of skin for Adam and his wife and clothed them.' God acts as a tailor. He replaces the inadequate fig-leaf aprons with something durable. An animal died for this covering. The text doesn't say which animal, but the principle is permanently established: blood is shed, a life is given, and shame is covered by something other than the sinner's own effort. The entire sacrificial logic of Leviticus, the Day of Atonement, and the New Testament's language of being clothed in Christ's righteousness all find their silent root in this single tender act before the gates of Eden close forever.",
      "keyVerse": "The Lord God made garments of skin for Adam and his wife and clothed them. — Genesis 3:21 (NIV)",
      "memoryPrompt": "God's first response to human shame was not expulsion — it was clothing them, at the cost of the first death in Scripture.",
      "challengeFact": "Genesis 3:22 reveals that God's stated reason for expelling Adam and Eve was to prevent them from eating from the tree of life and living forever in a fallen state — making the expulsion partly an act of protective mercy, not solely punishment."
    },
    "questions": [
      {
        "id": "GEN-03-B-Q1",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 3:7, what did Adam and Eve make for themselves immediately after their eyes were opened and they realised they were naked?",
        "options": [
          "Garments of animal skin",
          "Robes woven from reeds",
          "Coverings from the bark of trees",
          "Coverings made from fig leaves"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 3:7"
      },
      {
        "id": "GEN-03-B-Q2",
        "difficultyLevel": "HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 3:19 (NIV), God tells Adam what he will ultimately return to. What is the exact phrase used?",
        "options": [
          "To dust you shall return, as from dust you came",
          "For dust you are, and to dust you shall return",
          "You came from the ground, and to the ground you will go",
          "From earth you were formed, and to earth you shall go back"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 3:19"
      },
      {
        "id": "GEN-03-B-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHEN",
        "question": "At precisely what point in the narrative of Genesis 3 does Adam name his wife 'Eve'?",
        "options": [
          "After God expelled them from the garden past the cherubim",
          "After God pronounced all the curses and before He clothed them",
          "Immediately after they ate the fruit and saw they were naked",
          "When God asked Adam to account for what he had done"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 3:20-21"
      },
      {
        "id": "GEN-03-B-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "In Genesis 3:22, God uses the phrase 'one of us' when speaking about what humanity has become. To whom does the context suggest God is speaking?",
        "options": [
          "The cherubim assigned to guard the garden",
          "The serpent who had just been cursed",
          "A divine heavenly council present with God",
          "The angels who would carry out the expulsion"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 3:22"
      },
      {
        "id": "GEN-03-B-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "SEQUENCE",
        "question": "In Genesis 3:8-13, what is the correct order of events after Adam and Eve heard God walking in the garden?",
        "options": [
          "God called Adam → they hid → Adam answered → God asked who told him he was naked → Adam blamed Eve → Eve blamed the serpent",
          "They hid → God called Adam → Adam answered he was afraid → God asked who told him → Adam blamed Eve → Eve blamed the serpent",
          "Adam answered → they hid → God questioned Eve first → Eve blamed Adam → Adam blamed the serpent",
          "They hid → Adam answered immediately → God asked Eve first → Eve blamed Adam → Adam blamed the serpent"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 3:8-13"
      },
      {
        "id": "GEN-03-B-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "HOW_MANY",
        "question": "Genesis 3:14-19 records God pronouncing consequences on three parties. How many total distinct consequences are stated across all three — serpent, woman, and man combined?",
        "options": ["Five", "Eight", "Six", "Seven"],
        "correctAnswer": 3,
        "verseReference": "Genesis 3:14-19"
      },
      {
        "id": "GEN-03-B-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 3:16 records God's words specifically to the woman. Which of the following is entirely absent from what God says to her in that verse?",
        "options": [
          "That her desire would be for her husband",
          "That her husband would rule over her",
          "That she would be expelled permanently from the garden",
          "That her pain in childbearing would be greatly increased"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 3:16"
      }
    ]
  },

  "GEN-04-A": {
    "lessonId": "GEN-04-A",
    "lessonTitle": "Cain and Abel",
    "passageRef": "Genesis 4:1-26",
    "studyCard": {
      "title": "The First Altar and the First Murder",
      "hook": "God rejected Cain's offering before Cain killed Abel — and the reason the text gives is more unsettling than most people realise.",
      "teaching": "The births of Cain and Abel in Genesis 4:1-2 are narrated with a striking asymmetry. When Eve bears Cain, she declares: 'With the help of the Lord I have brought forth a man.' It is a statement of partnership, even triumphalism. When Abel is born, the text simply says 'Later she gave birth to his brother Abel.' No speech. No celebration. Abel's name in Hebrew means 'breath' or 'vapour' — the same word used throughout Ecclesiastes for fleeting, insubstantial things. Abel is, from the moment of his naming, a figure whose brevity is written into his identity.\n\nThe question of why God accepted Abel's offering and rejected Cain's has occupied interpreters for millennia. The text says Abel brought 'fat portions from some of the firstborn of his flock' — specific, costly, the best. Cain brought 'some of the fruits of the soil' — general, unspecific, with no indicator of quality or priority. The contrast in precision is deliberate. But Genesis 4 does not make the rejection primarily about the offering itself. God's words to Cain immediately after focus entirely on Cain's inner state: 'Why is your face downcast? If you do what is right, will you not be accepted?' The problem is not the vegetables — it is what Cain's heart is doing with the rejection.\n\nGod's warning to Cain in verse 7 contains one of the most vivid images in all of early Genesis: 'sin is crouching at the door; it desires to have you, but you must rule over it.' The Hebrew word for 'crouching' — 'rovets' — is an animal posture, a predator coiled before a strike. Sin is not presented here as an abstract moral category. It is a living, predatory force with appetite and intention. This is the first time the word 'sin' appears in the entire Bible, and it arrives not as a theological definition but as a warning about a beast at the door. Cain does not heed it.\n\nAfter the murder, God's questioning of Cain deliberately echoes His questioning of Adam in Genesis 3. 'Where is your brother Abel?' mirrors 'Where are you, Adam?' But Cain's response marks a new depth of defiance. Adam hid; Cain lies. Adam deflected blame; Cain asks a counter-question: 'Am I my brother's keeper?' It is the first rhetorical deflection in Scripture — and the question, meant to dismiss responsibility, has ironically become one of the most morally searching questions in human history.\n\nThe mark God places on Cain in verse 15 is almost universally misread as a mark of shame. Read the text: it is a mark of protection. God places it on Cain specifically so that no one who finds him will kill him. The God who is judging Cain is simultaneously protecting him. This pattern — judgment and mercy woven together — has already appeared in the garden with the garments of skin, and it will appear again and again through the entire biblical narrative. Grace does not wait for people to deserve it. It moves first.",
      "keyVerse": "If you do what is right, will you not be accepted? But if you do not do what is right, sin is crouching at your door; it desires to have you, but you must rule over it. — Genesis 4:7 (NIV)",
      "memoryPrompt": "The first use of the word 'sin' in the Bible is not a definition — it is a warning about a predator crouching at Cain's door.",
      "challengeFact": "The mark God put on Cain in Genesis 4:15 is almost universally assumed to be a mark of shame or punishment — but the text states explicitly it was a protective mark placed on him so that no one who found him would kill him."
    },
    "questions": [
      {
        "id": "GEN-04-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 4:4, what specific kind of offering did Abel bring to the Lord?",
        "options": [
          "The firstfruits of his harvest and a grain offering",
          "A burnt offering from the firstborn of his flock",
          "Fat portions from some of the firstborn of his flock",
          "The choicest animals from his herd and flock"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 4:4"
      },
      {
        "id": "GEN-04-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 4:7 (NIV), how does God describe sin in His warning to Cain immediately before the murder?",
        "options": [
          "Sin lies dormant within you, ready to consume you",
          "Sin waits at your threshold like a thief in the dark",
          "Sin is a fire that seeks to devour the one who harbours it",
          "Sin is crouching at your door; it desires to have you"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 4:7"
      },
      {
        "id": "GEN-04-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 4:16, where did Cain go and settle after being driven out from the Lord's presence?",
        "options": [
          "The land of Shinar, east of the garden",
          "The land of Nod, east of Eden",
          "The land of Havilah, beyond the Euphrates",
          "The land of Canaan, south of the mountains"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 4:16"
      },
      {
        "id": "GEN-04-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 4:17, what did Cain name the city he built, and what was the basis for that name?",
        "options": [
          "He named it Eden, after the garden from which he was exiled",
          "He named it Babel, meaning 'gate of God'",
          "He named it Enoch, after his son",
          "He named it Nod, after the land where he settled"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 4:17"
      },
      {
        "id": "GEN-04-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "Lamech, a descendant of Cain, speaks to his two wives in Genesis 4:23-24. He claims that if Cain's killer would be avenged sevenfold, he himself would be avenged how many times?",
        "options": ["Forty-nine times", "Seventy-seven times", "Seven times", "Seventy times seven"],
        "correctAnswer": 1,
        "verseReference": "Genesis 4:24"
      },
      {
        "id": "GEN-04-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "Genesis 4:17-22 traces Cain's lineage. Which of the following correctly lists the sequence from Cain to Lamech's children?",
        "options": [
          "Cain → Enoch → Irad → Mehujael → Methushael → Lamech → Jabal, Jubal, Tubal-Cain",
          "Cain → Irad → Enoch → Methushael → Mehujael → Lamech → Jubal, Jabal, Naamah",
          "Cain → Enoch → Mehujael → Irad → Methushael → Lamech → Tubal-Cain, Jubal, Jabal",
          "Cain → Mehujael → Enoch → Irad → Lamech → Methushael → Jabal, Jubal, Tubal-Cain"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 4:17-22"
      },
      {
        "id": "GEN-04-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 4:15 describes the mark God placed on Cain. Which of the following details is entirely absent from what the text actually states about this mark?",
        "options": [
          "That it was placed on Cain so no one who found him would kill him",
          "That God threatened sevenfold vengeance on anyone who killed Cain",
          "A description of what the mark looked like or where it was placed on his body",
          "That the mark was connected to God's response to Cain's punishment"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 4:15"
      }
    ]
  },
    
  "GEN-05-A": {
    "lessonId": "GEN-05-A",
    "lessonTitle": "From Adam to Noah",
    "passageRef": "Genesis 5:1-32",
    "studyCard": {
      "title": "The Genealogy That Hides a Sermon",
      "hook": "Genesis 5 looks like a list of names and numbers — but hidden inside it is a sentence that reads as the oldest prophecy in the Bible.",
      "teaching": "Genesis 5 opens with a direct callback to the creation account: 'This is the written account of Adam's family line. When God created mankind, he made them in the likeness of God.' The chapter is not merely a genealogy — it is a theological statement about the transmission of something from generation to generation. And what is transmitted, the text makes clear in verse 3, is not just life: 'Adam had a son in his own likeness, in his own image.' The divine image passes through Adam's fallen line. Humanity still bears God's image after the Fall, but now it is refracted through Adam's nature, not received fresh from God's direct breath.\n\nThe rhythm of Genesis 5 is relentless and deliberate. Name. Age at fatherhood. Years lived after. Total years. 'And then he died.' That phrase — repeated eight times — is the drumbeat of the chapter. It is the verdict of Genesis 3 playing out in slow motion across centuries. Each man lives an extraordinarily long life, each fathered sons and daughters, and each one dies. The repetition is not stylistic laziness. It is the author driving home a single point: the curse is real. The sentence has been carried out. Every generation, without exception, confirms it.\n\nThe single exception to the death refrain is Enoch, in verses 21-24. After 365 years, 'Enoch walked faithfully with God; then he was no more, because God took him.' No death. No burial. No 'and then he died.' In a chapter structured entirely around dying, Enoch simply disappears into God. The number 365 — matching the days in a solar year — is likely not accidental; it marks Enoch as complete, full, aligned with the rhythms of creation. The New Testament picks up Enoch's story in Hebrews 11:5 and Jude 1:14-15, identifying him as a prophet who spoke of coming judgment. He is the single ray of light in a chapter of graves.\n\nThe hidden sermon within Genesis 5 is most visible when you trace the meaning of the names in their original Hebrew. Adam means 'man.' Seth means 'appointed.' Enosh means 'mortal.' Kenan means 'sorrow.' Mahalalel means 'the blessed God.' Jared means 'shall come down.' Enoch means 'teaching' or 'commencement.' Methuselah means 'his death shall bring.' Lamech means 'the despairing.' Noah means 'rest' or 'comfort.' Strung together in sequence, they read: 'Man appointed mortal sorrow; the blessed God shall come down teaching that His death shall bring the despairing rest.' Whether this is intentional authorial design or an extraordinary coincidence, it has convinced many Hebrew scholars that Genesis 5 is not a filler chapter between the Fall and the Flood — it is a compressed prophecy.\n\nMethuselah holds the record for the longest human life in Scripture — 969 years. What is less often noted is the timing of his death. According to the genealogical numbers in Genesis 5 and 7, Methuselah died in the very year of the Flood. Whether he died in the Flood itself or just before it, the mathematics of the text place his passing at the threshold of judgment. His name, meaning 'his death shall bring it,' takes on a gravity that most Bible readers never notice.",
      "keyVerse": "Enoch walked faithfully with God; then he was no more, because God took him. — Genesis 5:24 (NIV)",
      "memoryPrompt": "In a chapter where every man dies, Enoch simply vanishes — because walking with God changes the ending.",
      "challengeFact": "The Hebrew meanings of the ten names in Genesis 5 — Adam through Noah — form a consecutive sentence that reads as a compressed messianic prophecy, a detail virtually invisible to readers of English translations."
    },
    "questions": [
      {
        "id": "GEN-05-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 5:5, how many years did Adam live in total?",
        "options": ["777 years", "912 years", "930 years", "969 years"],
        "correctAnswer": 2,
        "verseReference": "Genesis 5:5"
      },
      {
        "id": "GEN-05-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 5:29, what reason did Lamech give for naming his son Noah?",
        "options": [
          "Because he would be a man who walked with God above all others",
          "Because he was born in the image and likeness of Adam",
          "Because he will comfort them in their toil and painful labour caused by the cursed ground",
          "Because he would find favour in the eyes of God and escape destruction"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 5:29"
      },
      {
        "id": "GEN-05-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 5:21-23, how many years did Enoch live in total before God took him?",
        "options": ["300 years", "430 years", "500 years", "365 years"],
        "correctAnswer": 3,
        "verseReference": "Genesis 5:23"
      },
      {
        "id": "GEN-05-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 5:24 (NIV), the text describes Enoch's end without using the phrase 'and then he died.' What does it say instead?",
        "options": [
          "God brought him into his presence, and he was seen no more",
          "Enoch walked faithfully with God; then he was no more, because God took him",
          "The Lord received Enoch, and he was taken up from the earth",
          "Enoch was gathered to his people, for God had favoured him"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 5:24"
      },
      {
        "id": "GEN-05-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 5:3, in whose image and likeness did Adam father his son Seth?",
        "options": [
          "In the image and likeness of God, as Adam himself had been made",
          "In his own likeness, in his own image",
          "In the likeness of Eve, his mother",
          "In the likeness of Abel, the brother Seth replaced"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 5:3"
      },
      {
        "id": "GEN-05-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "Which of the following correctly lists the sequence of the first five names in the Genesis 5 genealogy from Adam onward?",
        "options": [
          "Adam, Seth, Enosh, Kenan, Mahalalel",
          "Adam, Cain, Seth, Enosh, Kenan",
          "Adam, Seth, Kenan, Enosh, Mahalalel",
          "Adam, Enosh, Seth, Kenan, Jared"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 5:1-15"
      },
      {
        "id": "GEN-05-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 5 repeats a closing death formula for each patriarch. Which individual in the Genesis 5 genealogy is the sole exception — the only one for whom the phrase 'and then he died' does not appear?",
        "options": [
          "Noah, because the chapter ends before recording his death",
          "Methuselah, because his death occurs outside the chapter's timeframe",
          "Lamech, because he died before the Flood came",
          "Enoch, because God took him and he bypassed death entirely"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 5:21-24"
      }
    ]
  },

  "GEN-06-A": {
    "lessonId": "GEN-06-A",
    "lessonTitle": "The Flood Begins",
    "passageRef": "Genesis 6:1-7:24",
    "studyCard": {
      "title": "When Heaven Grieved and the Waters Rose",
      "hook": "God's decision to send the Flood is introduced not with anger but with grief — and that single word changes everything about how you understand divine judgment.",
      "teaching": "Genesis 6 opens with one of the most debated passages in all of Scripture: the 'sons of God' taking the 'daughters of humans' as wives. Three major interpretive traditions have wrestled with this for centuries. The oldest — held by most Second Temple Jewish writers and referenced in Jude 1:6 and 2 Peter 2:4 — understands the 'sons of God' as divine or angelic beings crossing the boundary between heaven and earth. A second tradition reads them as the godly line of Seth intermarrying with the ungodly line of Cain. A third reads them as ancient kings claiming divine status. Whatever your reading, the text's point is unmistakable: a catastrophic boundary violation has occurred, and the result is a world so corrupt that God's own assessment is one of comprehensive ruin.\n\nThe most theologically stunning verse in the entire passage is Genesis 6:6: 'The Lord regretted that he had made human beings on the earth, and his heart was deeply troubled.' The Hebrew word for 'troubled' — 'yitatsev' — is a word of intense emotional pain, the same root used in Genesis 3:16-17 for the pain of childbirth and toil. God is not detached. He is not administering a cold judicial sentence. He is grieving. The God who breathed life into Adam's nostrils and called everything good now looks at what that creation has become and is heartbroken. Divine judgment in Genesis 6 does not begin with wrath. It begins with sorrow.\n\nNoah's introduction in verse 9 is built on three compounding descriptions: 'Noah was a righteous man, blameless among the people of his time, and he walked faithfully with God.' The phrase 'blameless among the people of his time' is significant — it does not say Noah was sinless. It says he was blameless in context, measured against his generation. And 'walked faithfully with God' deliberately echoes Enoch in Genesis 5:24. Noah is Enoch's spiritual heir — a man who, in the middle of comprehensive moral collapse, maintained his orientation toward God.\n\nThe dimensions of the ark given in Genesis 6:15 are precise and, to ancient readers, immediately significant. 300 cubits long, 50 cubits wide, 30 cubits high. These proportions — a length-to-width ratio of 6:1 — are remarkably close to the ratios used in modern naval architecture for maximum stability in open-sea conditions. Naval engineers who have studied the ark's dimensions note that a vessel of these proportions would be nearly impossible to capsize. The text is not giving you mythology. It is giving you a seaworthy vessel, and the precision of the numbers signals that the author intends you to take the structure seriously.\n\nWhen the Flood comes in Genesis 7, the text specifies two simultaneous sources: 'all the springs of the great deep burst forth, and the floodgates of the heavens were opened.' This is the reversal of the creation order in Genesis 1. On Day 2, God separated the waters above from the waters below and placed dry land between them. In Genesis 7, those separations collapse. The waters above and below are released simultaneously. The Flood is not just a disaster — it is a de-creation, a return to the formless and empty state of Genesis 1:2, from which God will once again bring order.",
      "keyVerse": "The Lord saw how great the wickedness of the human race had become on the earth, and that every inclination of the thoughts of the human heart was only evil all the time. — Genesis 6:5 (NIV)",
      "memoryPrompt": "The Flood is not just a disaster — it is a de-creation, a deliberate reversal of the separations God made on Day 2.",
      "challengeFact": "The dimensions of Noah's ark in Genesis 6:15 — 300 cubits by 50 by 30 — produce a length-to-width ratio of 6:1, which modern naval architects identify as the optimal ratio for stability in open-sea conditions, making it nearly impossible to capsize."
    },
    "questions": [
      {
        "id": "GEN-06-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 6:15, what were the exact dimensions God gave Noah for the ark — length, width, and height in cubits?",
        "options": [
          "400 cubits long, 60 cubits wide, 40 cubits high",
          "300 cubits long, 50 cubits wide, 30 cubits high",
          "300 cubits long, 40 cubits wide, 50 cubits high",
          "250 cubits long, 50 cubits wide, 30 cubits high"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 6:15"
      },
      {
        "id": "GEN-06-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 6:14, what material did God instruct Noah to use in constructing the ark?",
        "options": [
          "Cedar wood, treated with pitch inside and out",
          "Cypress wood, coated with pitch inside and out",
          "Acacia wood, sealed with resin inside and out",
          "Oak timber, waterproofed with tar inside and out"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 6:14"
      },
      {
        "id": "GEN-06-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 6:6 (NIV), what two things does the text say the Lord did in response to human wickedness?",
        "options": [
          "He was angered and resolved to blot out every living thing",
          "He regretted making humans, and his heart was deeply troubled",
          "He grieved and determined to send waters over all the earth",
          "He was sorrowful and withdrew his spirit from the earth"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 6:6"
      },
      {
        "id": "GEN-06-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 6:16, how many decks or floors did God instruct Noah to build inside the ark?",
        "options": ["Two", "Four", "Three", "Five"],
        "correctAnswer": 2,
        "verseReference": "Genesis 6:16"
      },
      {
        "id": "GEN-06-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "Genesis 6:9 introduces Noah with three consecutive descriptions. Which of the following correctly lists all three as they appear in the text?",
        "options": [
          "Righteous, holy, and faithful to God's commands",
          "Blameless, righteous, and favoured above all people",
          "Righteous, blameless among the people of his time, and walked faithfully with God",
          "Faithful, upright in all his ways, and blameless before the Lord"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 6:9"
      },
      {
        "id": "GEN-06-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 7:11-12, two events are described as happening simultaneously at the start of the Flood. What is the correct pairing as stated in the text?",
        "options": [
          "The rain began falling and the animals entered the ark on the same day",
          "The springs of the great deep burst forth and the floodgates of the heavens were opened",
          "The waters rose above the mountains and the ark began to float",
          "God shut the door of the ark and the rain fell for forty days"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 7:11-12"
      },
      {
        "id": "GEN-06-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 6:19-20 records God's instructions to Noah about bringing animals onto the ark. Which of the following is NOT part of what God specifies in those verses?",
        "options": [
          "That Noah should bring two of every kind of living creature",
          "That the animals should include male and female of each kind",
          "That Noah should bring seven pairs of every clean animal",
          "That the animals would include birds, livestock, and creatures that move along the ground"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 6:19-20"
      }
    ]
  },

   "GEN-07-A": {
    "lessonId": "GEN-07-A",
    "lessonTitle": "The Flood and Its Recession",
    "passageRef": "Genesis 7:1-8:22",
    "studyCard": {
      "title": "The Waters That Remembered and Receded",
      "hook": "The turning point of the entire Flood narrative is a single Hebrew verb — God 'remembered' Noah — and in the Bible, divine remembering is never passive recollection; it is always the beginning of decisive action.",
      "teaching": "Genesis 7 opens with a distinction that catches most readers off guard. God's instruction in verses 2-3 differentiates between clean and unclean animals — seven pairs of every clean animal, one pair of every unclean. This is the first appearance of clean and unclean categories in Scripture, centuries before Leviticus codifies them. Most people assume the clean/unclean distinction was invented at Sinai. Genesis 7 quietly disproves that assumption. The categories predate the Law — they are part of an older ordering of creation that Noah understood and that God expected him to apply.\n\nThe precision of the Flood's timeline is one of the most underappreciated features of the narrative. The Flood begins on the seventeenth day of the second month of Noah's six hundredth year. It rains for forty days and forty nights. The waters flood the earth for 150 days. The ark rests on the mountains of Ararat on the seventeenth day of the seventh month — exactly five months after the Flood began. Then a further sequence of receding waters, sent birds, and waiting periods unfolds with the kind of precision more characteristic of a ship's log than a myth. The author is not telling you a vague story about a great flood. He is giving you a dated, measured account.\n\nThe pivot of the entire narrative comes in Genesis 8:1: 'But God remembered Noah.' In Hebrew thought, divine remembering — 'zakar' — is never mere mental recollection. Every time God 'remembers' in the Old Testament, it triggers action. He remembered Rachel and opened her womb. He remembered Abraham and rescued Lot. He remembered His covenant and brought Israel out of Egypt. To be remembered by God is to be acted upon by God. The moment God remembers Noah, the wind comes, the waters recede, and the world begins its return to order. Salvation, in Genesis 8, begins with a single verb.\n\nNoah's use of a raven and then a dove to test the waters is more than a practical navigation strategy. The raven — an unclean bird that feeds on carrion — goes out and keeps flying back and forth until the water dries up. The dove — associated throughout Scripture with peace and the Spirit of God — is sent three times. The first time it returns with nothing. The second time it returns with an olive leaf. The third time it does not return at all. The olive leaf is one of the Bible's most enduring symbols of peace and restored relationship between God and the created world. Its appearance after judgment remains potent in every culture that has encountered the text.\n\nWhen Noah finally leaves the ark in Genesis 8:20, his first act is not to survey the damage, build a shelter, or plant crops. He builds an altar and offers burnt offerings. This is the first altar in Scripture, and it draws a direct response from God: 'The Lord smelled the pleasing aroma and said in his heart: Never again will I curse the ground because of humans.' Worship precedes everything else. Before provision, before reconstruction, before legacy — Noah's first priority is the acknowledgment that survival itself was God's gift. And God's response to that worship is a covenant promise that will carry through to Genesis 9.",
      "keyVerse": "But God remembered Noah and all the wild animals and the livestock that were with him in the ark, and he sent a wind over the earth, and the waters receded. — Genesis 8:1 (NIV)",
      "memoryPrompt": "When God 'remembered' Noah, it wasn't a thought — it was the beginning of rescue, because in the Bible divine remembering always triggers action.",
      "challengeFact": "Genesis 7:2-3 reveals that Noah was instructed to take seven pairs of every clean animal onto the ark — not just two — a detail almost universally overlooked, which also proves the clean/unclean distinction existed centuries before the Law of Moses."
    },
    "questions": [
      {
        "id": "GEN-07-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 7:12, how long did rain fall on the earth during the Flood?",
        "options": [
          "Twenty days and twenty nights",
          "Forty days and forty nights",
          "One hundred and fifty days",
          "Sixty days and sixty nights"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 7:12"
      },
      {
        "id": "GEN-07-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 8:4, on what mountains did the ark come to rest?",
        "options": [
          "The mountains of Lebanon",
          "The mountains of Sinai",
          "The mountains of Ararat",
          "The mountains of Gilead"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 8:4"
      },
      {
        "id": "GEN-07-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 7:2, how many pairs of clean animals was Noah instructed to take onto the ark?",
        "options": ["Two pairs", "Five pairs", "Seven pairs", "Ten pairs"],
        "correctAnswer": 2,
        "verseReference": "Genesis 7:2"
      },
      {
        "id": "GEN-07-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "SEQUENCE",
        "question": "In Genesis 8:6-12, Noah sent out birds to test whether the waters had receded. What is the correct sequence of events?",
        "options": [
          "Dove sent first, returned with nothing → raven sent, did not return → dove sent again, returned with olive leaf → dove sent again, did not return",
          "Raven sent, kept flying back and forth → dove sent, returned with nothing → dove sent again, returned with olive leaf → dove sent again, did not return",
          "Raven sent, returned with olive branch → dove sent, did not return → dove sent again with nothing → raven sent finally",
          "Dove sent three times first, then raven sent to confirm the earth was dry"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 8:6-12"
      },
      {
        "id": "GEN-07-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 8:20, what was the very first thing Noah did after leaving the ark?",
        "options": [
          "He surveyed the land to find a place to settle",
          "He gave thanks to God and blessed his sons",
          "He built an altar and sacrificed burnt offerings",
          "He planted a vineyard and cultivated the ground"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 8:20"
      },
      {
        "id": "GEN-07-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "WHEN",
        "question": "According to Genesis 7:11, on what specific date did the Flood begin — month and day — in the calendar year of Noah's life?",
        "options": [
          "The first day of the first month of Noah's six hundredth year",
          "The seventeenth day of the second month of Noah's six hundredth year",
          "The tenth day of the third month of Noah's five hundred and ninety-ninth year",
          "The seventeenth day of the first month of Noah's six hundredth year"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 7:11"
      },
      {
        "id": "GEN-07-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 8:21-22 records God's response after smelling Noah's offering. Which of the following is NOT stated in God's declaration in those two verses?",
        "options": [
          "That God would never again curse the ground because of humans",
          "That every inclination of the human heart is evil from childhood",
          "That God would establish a rainbow as a sign of the covenant",
          "That seedtime and harvest would never cease as long as the earth endures"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 8:21-22"
      }
    ]
  },

"GEN-08-A": {
    "lessonId": "GEN-08-A",
    "lessonTitle": "Covenant and the Table of Nations",
    "passageRef": "Genesis 9:1-10:32",
    "studyCard": {
      "title": "The Rainbow That Belongs to God, Not to Man",
      "hook": "The rainbow in Genesis 9 is not given to humanity as a reminder for them — God says explicitly it is a sign for Himself, a reminder He sets before His own eyes.",
      "teaching": "The covenant God establishes with Noah in Genesis 9 is the first formally named covenant in Scripture, and its scope is breathtaking. Unlike every covenant that follows — with Abraham, Moses, David — the Noahic covenant is not made with one people or one nation. It is made with Noah, with his descendants, and explicitly with 'every living creature on earth.' Animals are parties to this covenant. The ground itself is included. This is a covenant with creation, not just humanity — and it is entirely unconditional. God asks nothing of Noah in return. He simply promises.\n\nThe sign of the covenant is the rainbow — 'qeshet' in Hebrew, the same word used everywhere else in the Old Testament for a warrior's bow. This is not coincidence. The bow in ancient Near Eastern imagery was the primary weapon of war, hung up after battle as a declaration of peace. When God sets His bow in the clouds, He is doing what a warrior does when the fighting is over — hanging up His weapon. The rainbow is not a decorative symbol of hope. It is a decommissioned weapon of war, placed in the sky as a declaration that judgment of this kind is finished.\n\nGenesis 9:6 introduces a principle that will underpin all subsequent biblical jurisprudence: 'Whoever sheds human blood, by humans shall their blood be shed; for in the image of God has God made mankind.' The basis for the sanctity of human life is not sentimentality or social contract — it is the image of God. Human life is protected because of what a human being is, not merely what they can do or produce. This principle predates the Mosaic Law by centuries and remains the theological foundation for the value of human life across both Testaments.\n\nThe episode of Noah's drunkenness in Genesis 9:20-27 is one of the most misread passages in the entire Old Testament. The text says Ham 'saw his father naked' and told his brothers. Shem and Japheth walked backward with a garment and covered him without looking. The nature of Ham's sin has been debated: was it merely seeing? Was it mockery? Was it something more? What the text makes clear is that the response of the other two sons — careful, respectful, shielding — is held up as the standard of honour, and Ham's action of looking and reporting is treated as a serious violation. The subsequent curse falls not on Ham but on his son Canaan — a detail that will carry enormous geopolitical weight when Israel later confronts the Canaanites in the Promised Land.\n\nGenesis 10 — the Table of Nations — is sometimes skipped as a list of unpronounceable names, but it is a theological statement of the first order. Seventy nations are listed as descendants of Noah's three sons. Seventy is a number of completeness in Hebrew thought — the same number of Jacob's descendants who go down to Egypt, the same number of elders appointed by Moses. The Table of Nations is saying: all the peoples of the earth, in all their diversity and separation, trace back to one family. Humanity is one. Division came after unity, not before.",
      "keyVerse": "I have set my rainbow in the clouds, and it will be the sign of the covenant between me and the earth. — Genesis 9:13 (NIV)",
      "memoryPrompt": "The rainbow is God's bow hung up after battle — a warrior's declaration that this kind of judgment is finished.",
      "challengeFact": "In Genesis 9:16, God says the rainbow is a sign so that He Himself will remember the everlasting covenant — meaning the rainbow was given primarily as a reminder for God, not for humanity, reversing the assumption most people carry about its purpose."
    },
    "questions": [
      {
        "id": "GEN-08-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 9:4, what specific prohibition did God give Noah and his sons regarding the animals they were permitted to eat?",
        "options": [
          "They must not eat any animal that had not been offered as a sacrifice",
          "They must not eat flesh that still had its lifeblood in it",
          "They must not eat any creature that moves along the ground",
          "They must not consume fat or blood from any clean animal"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 9:4"
      },
      {
        "id": "GEN-08-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHO",
        "question": "According to Genesis 9:25-27, whose descendants did Noah curse — and whose did he bless — in his declaration after the incident with Ham?",
        "options": [
          "He cursed Ham directly and blessed Shem and Japheth equally",
          "He cursed Canaan, son of Ham, and blessed both Shem and Japheth",
          "He cursed Ham's entire line and blessed only Shem",
          "He cursed Canaan and blessed Shem, making no mention of Japheth"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 9:25-27"
      },
      {
        "id": "GEN-08-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 9:13 (NIV), how does God describe the purpose of the rainbow He sets in the clouds?",
        "options": [
          "It will be a sign of my promise to all living creatures on the earth",
          "It will be a sign of the covenant between me and the earth",
          "It will be a reminder that I will never again destroy all life",
          "It will be a covenant sign between me and every living thing"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 9:13"
      },
      {
        "id": "GEN-08-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 9:28, how many years did Noah live after the Flood?",
        "options": ["250 years", "450 years", "350 years", "500 years"],
        "correctAnswer": 2,
        "verseReference": "Genesis 9:28"
      },
      {
        "id": "GEN-08-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 9:20, what was the first thing Noah did as a man of the soil after the Flood?",
        "options": [
          "He built a city and named it after his youngest son",
          "He offered sacrifices on the altar he had previously built",
          "He planted a vineyard",
          "He cultivated the ground and produced grain for his household"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 9:20"
      },
      {
        "id": "GEN-08-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 9:8-11 records the formal establishment of God's covenant with Noah. Which of the following parties is explicitly NOT listed as being included in this covenant in those verses?",
        "options": [
          "Noah and his sons",
          "Every living creature that came out of the ark",
          "The angels who witnessed the Flood from heaven",
          "All future generations descended from Noah"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 9:8-11"
      },
      {
        "id": "GEN-08-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 9:20-23, what is the correct sequence of events in the incident involving Noah, his nakedness, and his sons?",
        "options": [
          "Noah drank wine → became drunk → Ham saw him and covered him → Shem and Japheth were told → Noah awoke and cursed Ham",
          "Noah planted a vineyard → drank wine → became uncovered → Ham saw and told his brothers → Shem and Japheth covered him walking backward",
          "Ham saw Noah → told his brothers → Shem and Japheth refused to help → Noah awoke and cursed Canaan",
          "Noah became drunk → Ham covered him → Shem and Japheth saw and reported → Noah awoke and blessed them"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 9:20-23"
      }
    ]
  },

 "GEN-09-A": {
    "lessonId": "GEN-09-A",
    "lessonTitle": "Babel and Abram's Line",
    "passageRef": "Genesis 11:1-32",
    "studyCard": {
      "title": "The Tower They Built and the Name God Called",
      "hook": "The builders of Babel were not trying to reach God — they were trying to stay together, and it was that very ambition that God directly opposed.",
      "teaching": "The Tower of Babel narrative in Genesis 11:1-9 is one of the most compressed and structurally elegant passages in the entire book. It is only nine verses long, yet it operates on multiple levels simultaneously. The stated goal of the builders is not religious ambition in the first instance — it is civic: 'so that we may make a name for ourselves and not be scattered over the face of the whole earth.' They are afraid of dispersal. They want permanence, identity, and unity on their own terms. The tower is not their sin. The refusal to fill the earth — the direct reversal of God's command in Genesis 9:1 — is their sin.\n\nThe literary structure of the passage is deliberately ironic. The builders boast about a tower 'that reaches to the heavens' — yet God must 'come down' to see it. The tower they are so proud of is apparently invisible from where God is. The contrast is not accidental. The author is gently mocking the ambition. What humanity considers sky-scraping, heaven-reaching achievement barely registers from God's vantage point. He has to descend just to examine what they've built. The architecture of pride is always smaller than it looks from the inside.\n\nGod's response in verse 6 is worth examining carefully: 'If as one people speaking the same language they have begun to do this, then nothing they plan to do will be impossible for them.' This is not a statement of fear. God is not threatened by human achievement. It is a diagnostic observation about what consolidated human pride, unchecked and undirected toward God, will inevitably produce. The scattering is not punishment in the simplest sense — it is limitation placed on a trajectory that leads to destruction. Like the expulsion from Eden preventing eternal corruption, the confusion of languages prevents something worse.\n\nThe genealogy in Genesis 11:10-26 moves quickly from Shem to Abram, and the compression is intentional. Each generation in this post-Flood line lives significantly shorter than the pre-Flood patriarchs of Genesis 5. Shem lives 600 years; by the time you reach Nahor, it is 148 years. Life is contracting. The world is ageing. And into this contracting, post-Babel world, a single name emerges at the end of the chapter: Abram. The entire machinery of Genesis — creation, Fall, Flood, scattering — has been building toward this introduction. The rest of Genesis, and in many ways the rest of the entire Bible, is the story of what God does through this one man and his descendants.\n\nGenesis 11:30 introduces Sarai with one devastating sentence: 'Now Sarai was childless because she was not able to conceive.' In a world where lineage was everything, where the promises of God were understood to travel through biological descendants, this is not a minor biographical detail. It is a crisis placed at the very foundation of everything God is about to promise. God will choose as the mother of His covenant people a woman the text introduces as barren. This is the Bible's established pattern: God consistently works through the humanly impossible so that the outcome is unmistakably His.",
      "keyVerse": "But the Lord came down to see the city and the tower the people were building. — Genesis 11:5 (NIV)",
      "memoryPrompt": "Babel's builders weren't reaching for God — they were refusing to scatter, and God opposed the disobedience, not the architecture.",
      "challengeFact": "The Tower of Babel narrative contains a subtle literary joke: the builders boast of a tower 'that reaches to the heavens,' yet God has to 'come down' just to see it — the author's ironic way of showing how small human pride looks from God's perspective."
    },
    "questions": [
      {
        "id": "GEN-09-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 11:2, where did the people settle when they came from the east and decided to build the tower?",
        "options": [
          "A plain in the land of Canaan",
          "A plain in the land of Shinar",
          "A valley in the land of Ararat",
          "A plain in the land of Assyria"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 11:2"
      },
      {
        "id": "GEN-09-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 11:3, what two building materials did the people use to construct the city and tower at Babel?",
        "options": [
          "Stone and mortar",
          "Brick and tar",
          "Mud bricks and resin",
          "Fired clay and bitumen"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 11:3"
      },
      {
        "id": "GEN-09-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 11:4 (NIV), what two stated goals did the builders give for constructing the city and tower?",
        "options": [
          "To honour God with a great work and to establish a lasting kingdom",
          "To make a name for themselves and not be scattered over the face of the whole earth",
          "To reach the heavens and to make themselves equal to the Most High",
          "To build a great civilisation and to protect themselves from another flood"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 11:4"
      },
      {
        "id": "GEN-09-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 11:27-29, who was Abram's father, and who were his two brothers named in the text?",
        "options": [
          "Father: Nahor; brothers: Haran and Lot",
          "Father: Terah; brothers: Nahor and Haran",
          "Father: Haran; brothers: Nahor and Lot",
          "Father: Terah; brothers: Lot and Milkah"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 11:27-29"
      },
      {
        "id": "GEN-09-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 11:31, where did Terah set out to go when he left Ur of the Chaldeans, and where did his family settle instead?",
        "options": [
          "Set out for Canaan but settled in Damascus",
          "Set out for Canaan but settled in Harran",
          "Set out for Babylon but settled in the land of Shinar",
          "Set out for Egypt but settled in Harran"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 11:31"
      },
      {
        "id": "GEN-09-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 11:26, at what age did Terah become the father of Abram, Nahor, and Haran?",
        "options": ["Sixty years old", "One hundred years old", "Seventy years old", "Ninety years old"],
        "correctAnswer": 2,
        "verseReference": "Genesis 11:26"
      },
      {
        "id": "GEN-09-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 11:1-9 gives the account of Babel. Which of the following details that people commonly associate with this story is entirely absent from the text of Genesis 11?",
        "options": [
          "That the people used brick and tar as building materials",
          "That God confused the people's language",
          "That the name of the tower was specifically called the Tower of Babel",
          "That the people were scattered over the face of the whole earth"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 11:1-9"
      }
    ]
  },

"GEN-10-A": {
    "lessonId": "GEN-10-A",
    "lessonTitle": "Abram's Call and Journey",
    "passageRef": "Genesis 12:1-14:24",
    "studyCard": {
      "title": "The Man Who Left Without Knowing Where",
      "hook": "Hebrews 11 says Abraham obeyed and went, 'even though he did not know where he was going' — but Genesis 12 never actually says God told him the destination before he left.",
      "teaching": "The call of Abram in Genesis 12:1-3 is one of the most consequential moments in the history of human civilization, and it is delivered in seven short lines. God tells Abram to leave three things: his country, his people, and his father's household — a triple severance from every source of identity, security, and belonging the ancient world offered. In exchange, God makes seven promises: I will make you a great nation, I will bless you, I will make your name great, you will be a blessing, I will bless those who bless you, I will curse those who curse you, and all peoples on earth will be blessed through you. Seven severances requested, seven promises given. The symmetry is not accidental.\n\nThe seven promises of Genesis 12:1-3 are the theological spine of the entire rest of the Bible. Every major movement in the Old Testament — the nation of Israel, the Exodus, the conquest of Canaan, the Davidic kingdom — is the outworking of these seven lines. And the final promise — 'all peoples on earth will be blessed through you' — is the one Paul quotes in Galatians 3:8 and identifies as 'the gospel announced in advance.' The gospel was not invented at Pentecost. It was announced to Abraham in Canaan, roughly two thousand years before Christ. Genesis 12 is where the New Testament begins.\n\nThe episode in Egypt in Genesis 12:10-20 is deeply uncomfortable for readers who want Abraham to be a hero from the start. Facing famine, he descends to Egypt — already a pattern the Bible will repeat with Jacob and eventually the entire nation. He instructs Sarai to say she is his sister rather than his wife, fearing the Egyptians will kill him to take her. The half-truth is still a lie in effect. Sarai enters Pharaoh's household. God afflicts Pharaoh with plagues. Pharaoh rebukes Abram. This sequence — the patriarch in Egypt, plagues on Pharaoh, the patriarch rebuked and sent out — is a miniature preview of the Exodus narrative that will unfold four hundred years later. Genesis is full of these embedded previews.\n\nThe war of the kings in Genesis 14 is one of the most historically textured passages in all of Genesis — nine kings, a coalition battle, the capture of Lot, and Abram's swift military response with 318 trained men. What catches most readers off guard is what follows the rescue: the appearance of Melchizedek, king of Salem and priest of God Most High, who brings out bread and wine and blesses Abram. Abram gives him a tenth of everything. This is the first tithe in Scripture, and it is given not to a Levitical priest — those won't exist for centuries — but to a mysterious king-priest whose name means 'king of righteousness' and whose city will eventually become Jerusalem. The writer of Hebrews will spend three chapters unpacking Melchizedek as a type of Christ.\n\nAbram's refusal of the king of Sodom's offer in Genesis 14:22-24 is a statement of profound theological clarity. He will take nothing — not even a sandal strap — from the king of Sodom, so that no one can say the king of Sodom made Abram rich. After Melchizedek's blessing, no human king's patronage is acceptable. Abram has already received blessing from a source higher than any earthly coalition. The sequencing is deliberate: Melchizedek first, Sodom's king second. Worship always recalibrates what you are willing to accept from the world.",
      "keyVerse": "I will make you into a great nation, and I will bless you; I will make your name great, and you will be a blessing. — Genesis 12:2 (NIV)",
      "memoryPrompt": "The gospel was announced to Abraham in Genesis 12 — Paul says so in Galatians 3:8 — making this the oldest proclamation of good news in Scripture.",
      "challengeFact": "Genesis 14:18 records that Melchizedek, king of Salem, brought out bread and wine — the exact elements later used by Christ at the Last Supper — making this the first appearance of those specific elements together in a priestly, covenantal context in all of Scripture."
    },
    "questions": [
      {
        "id": "GEN-10-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 14:14, how many trained men did Abram take with him when he pursued the kings who had captured Lot?",
        "options": ["218 men", "318 men", "418 men", "518 men"],
        "correctAnswer": 1,
        "verseReference": "Genesis 14:14"
      },
      {
        "id": "GEN-10-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHO",
        "question": "According to Genesis 12:16, what did Pharaoh give Abram on account of Sarai?",
        "options": [
          "Gold, silver, and fine linen",
          "Sheep, cattle, donkeys, male and female servants, and camels",
          "Flocks, servants, and a portion of the finest land in Egypt",
          "Silver, livestock, and a household of servants"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 12:16"
      },
      {
        "id": "GEN-10-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 12:8, after leaving Bethel, where did Abram pitch his tent and build his second altar in Canaan?",
        "options": [
          "Between Bethel and Ai, in the hill country",
          "Near the great trees of Mamre at Hebron",
          "Near Shechem, at the great tree of Moreh",
          "On the hills east of Bethel, with Bethel to the west and Ai to the east"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 12:8"
      },
      {
        "id": "GEN-10-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 14:18-20, what two roles did Melchizedek hold when he met Abram after the battle?",
        "options": [
          "Prophet of El Elyon and ruler of the valley of Shaveh",
          "King of Salem and priest of God Most High",
          "King of Canaan and high priest of the eternal covenant",
          "Ruler of Jerusalem and servant of the Lord of hosts"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 14:18"
      },
      {
        "id": "GEN-10-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 12:1 (NIV), God instructs Abram to leave three specific things. What are they, in the order the text lists them?",
        "options": [
          "Your homeland, your kindred, and your father's house",
          "Your country, your people, and your father's household",
          "Your nation, your family, and the land of your birth",
          "Your father's house, your people, and the land of Canaan"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 12:1"
      },
      {
        "id": "GEN-10-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 12:10-20, what is the correct sequence of events during Abram's time in Egypt?",
        "options": [
          "Famine → Abram entered Egypt → instructed Sarai to say she was his sister → Sarai taken to Pharaoh's palace → Abram received gifts → God afflicted Pharaoh → Pharaoh rebuked Abram → Abram sent away",
          "Famine → God warned Abram → Abram went to Egypt → Pharaoh took Sarai → Abram afflicted Pharaoh → Abram rebuked → sent away with gifts",
          "Famine → Abram entered Egypt → Pharaoh took Sarai immediately → Abram received nothing → God afflicted Pharaoh → Abram rebuked → sent away",
          "Famine → Sarai suggested the plan → Abram agreed → Pharaoh blessed Abram → God afflicted Pharaoh → Abram and Sarai fled Egypt"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 12:10-20"
      },
      {
        "id": "GEN-10-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 12:1-3 records God's call and promises to Abram. Which of the following details commonly associated with the Abrahamic covenant does NOT appear anywhere in Genesis 12:1-3?",
        "options": [
          "That Abram would be made into a great nation",
          "That all peoples on earth would be blessed through him",
          "That his descendants would inherit the land of Canaan specifically",
          "That God would bless those who bless Abram"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 12:1-3"
      }
    ]
  },

"GEN-11-A": {
    "lessonId": "GEN-11-A",
    "lessonTitle": "Covenant and Circumcision",
    "passageRef": "Genesis 15:1-17:27",
    "studyCard": {
      "title": "The Night God Walked Between the Pieces",
      "hook": "In Genesis 15, God ratifies His covenant with Abram through an ancient treaty ritual — but with one stunning reversal: only God walks through the pieces, making this the only self-binding covenant in Scripture where the human party is asleep.",
      "teaching": "Genesis 15 opens with God speaking to Abram in a vision and Abram responding with two of the most honest questions any human being asks God in the entire Bible: 'What can you give me since I remain childless?' and 'How can I know that I will gain possession of it?' These are not faithless questions — they are the questions of a man who has been waiting a long time and needs something more than words. God does not rebuke the questions. He answers them with a covenant, a ceremony, and stars.\n\nThe covenant ceremony of Genesis 15:9-17 is one of the most ancient legal rituals in the biblical world. Animals were cut in half and the two parties of a covenant would walk between the pieces — effectively saying 'may what happened to these animals happen to me if I break this covenant.' It was a mutual oath sealed in blood. What happens in Genesis 15 shatters the expected pattern. God causes a deep sleep to fall on Abram — the same word 'tardemah' used in Genesis 2:21 when God took the rib from Adam. Abram does not walk between the pieces. Only God does — represented by a smoking firepot and a blazing torch moving through the halves. God takes the full weight of the covenant oath on Himself alone. If this covenant is broken, the consequences fall entirely on God. It is the most astonishing act of divine condescension in the entire Old Testament.\n\nThe introduction of Hagar and Ishmael in Genesis 16 is one of the Bible's most painfully human stories. Sarai, still childless, offers her Egyptian servant to Abram as a surrogate — a practice well-documented in ancient Near Eastern law codes including the Code of Hammurabi. This is not a story about moral failure in a simple sense; it is a story about human beings attempting to solve a divine problem with a human solution. When Hagar conceives and 'begins to despise' Sarai, the relational fracture is immediate and lasting. The son of the flesh and the son of the promise will never fully coexist. Paul uses this dynamic in Galatians 4 as an allegory for law and grace.\n\nGenesis 17 marks a seismic shift in the covenant. Thirteen years have passed since Ishmael's birth — thirteen years of silence from God. When God appears again, He changes Abram's name to Abraham and Sarai's to Sarah. Name changes in the Bible always signal identity transformation, a new calling inscribed in what people call you every day. God also institutes circumcision as the covenant sign — every male in Abraham's household, and every male descendant. Unlike the rainbow, which was a sign God set in the sky, circumcision is a sign cut into the body. The covenant is not merely announced to Abraham's family — it is written on them.\n\nGod's announcement in Genesis 17:16 that Sarah will bear a son produces one of the most theologically significant moments of laughter in Scripture — Abraham falls facedown and laughs. He is ninety-nine years old. Sarah is ninety. The laughter is not unbelief in a simple sense; Hebrews 11:11 credits Sarah with faith. It is the laughter of someone confronting the genuinely absurd — and God's response is to name the son of this laughter 'Isaac,' which means 'he laughs.' God does not erase the laughter. He names the promise after it.",
      "keyVerse": "He took him outside and said, 'Look up at the sky and count the stars — if indeed you can count them.' Then he said to him, 'So shall your offspring be.' — Genesis 15:5 (NIV)",
      "memoryPrompt": "Only God walked between the pieces in Genesis 15 — making it the one covenant in Scripture where the divine party bears all the risk.",
      "challengeFact": "In the covenant ceremony of Genesis 15, Abram is put into a deep sleep and never walks between the animal halves — meaning God unilaterally takes on the full self-curse of the covenant, a theological reality with direct implications for what Christ does on the cross."
    },
    "questions": [
      {
        "id": "GEN-11-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 15:9, how many animals did God instruct Abram to bring for the covenant ceremony, and what were they?",
        "options": [
          "Four animals: a heifer, a goat, a ram, and a turtledove",
          "Five animals: a heifer, a goat, a ram, a dove, and a young pigeon",
          "Three animals: a heifer, a goat, and a ram, plus a dove and a pigeon",
          "Two animals: a ram and a heifer, with a dove and pigeon added"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 15:9"
      },
      {
        "id": "GEN-11-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 17:10-11, what did God institute as the sign of the covenant between Him and Abraham's descendants?",
        "options": [
          "The offering of firstborn animals at the altar",
          "The keeping of the seventh day as a day of rest",
          "Circumcision of every male",
          "The wearing of the covenant name on their bodies"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 17:10-11"
      },
      {
        "id": "GEN-11-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHEN",
        "question": "According to Genesis 17:24-25, at what ages were Abraham and Ishmael circumcised on the same day?",
        "options": [
          "Abraham was 99 and Ishmael was 14",
          "Abraham was 100 and Ishmael was 13",
          "Abraham was 99 and Ishmael was 13",
          "Abraham was 100 and Ishmael was 16"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 17:24-25"
      },
      {
        "id": "GEN-11-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 16:1, what was the nationality of Hagar, Sarai's servant whom she gave to Abram?",
        "options": ["Canaanite", "Cushite", "Egyptian", "Babylonian"],
        "correctAnswer": 2,
        "verseReference": "Genesis 16:1"
      },
      {
        "id": "GEN-11-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 15:6 (NIV), how does the text describe Abram's response to God's promise, and what was the result?",
        "options": [
          "Abram trusted in the Lord, and it was counted to him as obedience",
          "Abram believed the Lord, and he credited it to him as righteousness",
          "Abram feared the Lord, and it was reckoned to him as faithfulness",
          "Abram obeyed the Lord, and he credited it to him as righteousness"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 15:6"
      },
      {
        "id": "GEN-11-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 15:12-17, what is the correct sequence of events during the covenant ceremony?",
        "options": [
          "Abram drove away birds → deep sleep fell → God declared 400 years of slavery → sun set → smoking firepot and torch appeared → passed between pieces",
          "Deep sleep fell on Abram → God declared the future → sun set and darkness came → smoking firepot and torch passed between pieces",
          "Sun set → deep sleep fell on Abram → God declared 400 years → smoking firepot appeared → Abram and God both walked through",
          "God declared the future → Abram fell asleep → sun rose → firepot and torch appeared → God walked alone"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 15:12-17"
      },
      {
        "id": "GEN-11-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 17:1-8 records God's covenant with Abraham. Which of the following promises, commonly associated with the Abrahamic covenant, does NOT appear in God's words in those eight verses?",
        "options": [
          "That Abraham would be the father of many nations",
          "That God would establish His covenant as an everlasting covenant",
          "That the land of Canaan would be given to his descendants as an eternal possession",
          "That Abraham's descendants would be as numerous as the stars in the sky"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 17:1-8"
      }
    ]
  },

"GEN-12-A": {
    "lessonId": "GEN-12-A",
    "lessonTitle": "Sodom and Gomorrah",
    "passageRef": "Genesis 18:1-19:38",
    "studyCard": {
      "title": "The God Who Stops to Explain Himself",
      "hook": "Before destroying Sodom, God pauses and asks Himself out loud whether He should hide what He is about to do from Abraham — and what He does next is one of the most remarkable acts of divine transparency in all of Scripture.",
      "teaching": "Genesis 18 opens at the heat of the day with three visitors appearing at Abraham's tent. Abraham's response is extraordinary in its urgency — he runs to meet them, bows low, and immediately begins orchestrating an elaborate meal. The text will later make clear that at least one of these visitors is the Lord Himself, and the other two are angels. But Abraham's hospitality precedes any such recognition. He is not performing hospitality because he knows who they are; he is performing it because hospitality to strangers was, in the ancient Near East, a sacred obligation. The New Testament commentary on this passage in Hebrews 13:2 is precise: 'Do not forget to show hospitality to strangers, for by so doing some people have shown hospitality to angels without knowing it.'\n\nThe announcement of Isaac's imminent birth in Genesis 18:10 provokes Sarah's laughter from behind the tent entrance — she is eavesdropping. 'After I am worn out and my lord is old, will I now have this pleasure?' The laughter is understandable. She is ninety years old. But God hears it and asks Abraham directly: 'Why did Sarah laugh?' When Sarah denies laughing, God's response is simple and devastating: 'Yes, you did laugh.' God does not argue. He does not elaborate. He just states the truth and moves on. The contrast with Isaac's name — 'he laughs' — makes the moment richer. God will turn her denial into a name.\n\nGenesis 18:16-33 contains one of the most theologically daring conversations in the entire Bible. God decides not to hide from Abraham what He is about to do to Sodom, reasoning that Abraham is the one through whom all nations will be blessed and therefore deserves to know. Then Abraham negotiates — for fifty righteous people, then forty-five, forty, thirty, twenty, ten. Each time God agrees. Abraham stops at ten. The audacity of the intercession is breathtaking, but equally remarkable is God's patience. He does not rebuke Abraham's persistence. He engages every step. The God of Genesis 18 is not an unapproachable sovereign issuing decrees; He is a God who explains Himself, who negotiates, who listens.\n\nThe destruction of Sodom in Genesis 19 is framed throughout by Lot's painful inadequacy. The angels must physically drag him, his wife, and his daughters out of the city. 'He hesitated,' the text says in verse 16, 'so the men grasped his hand and the hands of his wife and of his two daughters and led them safely out of the city, for the Lord was merciful to them.' Even at the threshold of judgment, mercy is the operating force. Lot is not saved because he deserves it. He is saved because of Abraham's intercession and God's mercy — a pattern the New Testament will identify explicitly in 2 Peter 2:7-8.\n\nLot's wife looking back in Genesis 19:26 is one of the Bible's most haunting images. The text offers no commentary on her motive — whether it was grief, disobedience, or longing. It simply states the fact and the consequence: she became a pillar of salt. Jesus references her in Luke 17:32 with three words: 'Remember Lot's wife.' In context, He is warning about the danger of turning back when God has commanded forward movement. The brevity of the reference shows how deeply the story had embedded itself in the theological imagination of those who knew the text.",
      "keyVerse": "Will you sweep away the righteous with the wicked? What if there are fifty righteous people in the city? Will you really sweep it away and not spare the place for the sake of the fifty righteous people in it? — Genesis 18:23-24 (NIV)",
      "memoryPrompt": "Abraham stopped negotiating at ten — and there weren't ten — which means the intercession changed the rescue of Lot, not the fate of the city.",
      "challengeFact": "Genesis 19:16 says Lot 'hesitated' before leaving Sodom — meaning the angels had to physically take hold of him, his wife, and his two daughters and drag them out of the city by hand, a detail that completely disrupts the image of Lot as a willing and ready escapee."
    },
    "questions": [
      {
        "id": "GEN-12-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "In Genesis 18:28-32, Abraham negotiates with God over how many righteous people would be required to spare Sodom. At what number does Abraham stop the negotiation?",
        "options": ["Fifteen", "Five", "Twenty", "Ten"],
        "correctAnswer": 3,
        "verseReference": "Genesis 18:32"
      },
      {
        "id": "GEN-12-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 19:24, what did the Lord rain down on Sodom and Gomorrah?",
        "options": [
          "Fire and hailstones from the sky",
          "Burning sulfur and fire from the Lord out of the heavens",
          "Brimstone and burning coals from the clouds",
          "Floodwaters mixed with fire from above"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 19:24"
      },
      {
        "id": "GEN-12-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 19:30, where did Lot go to live after he was afraid to stay in Zoar?",
        "options": [
          "He settled in the valley of the Jordan near the Dead Sea",
          "He went up and lived in the mountains, dwelling in a cave with his daughters",
          "He journeyed to the hill country of Hebron near Abraham's settlement",
          "He returned toward Sodom to see if any city remained"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 19:30"
      },
      {
        "id": "GEN-12-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHEN",
        "question": "According to Genesis 18:1, at what time of day did the Lord appear to Abraham at the great trees of Mamre?",
        "options": [
          "At dawn, when Abraham rose early",
          "In the evening, as the sun was setting",
          "In the heat of the day",
          "At midmorning, as the dew was lifting"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 18:1"
      },
      {
        "id": "GEN-12-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 19:14, how did Lot's future sons-in-law respond when he warned them to leave Sodom?",
        "options": [
          "They packed their belongings but then hesitated at the gate",
          "They refused to listen and drove Lot away from their houses",
          "They thought he was joking and did not take him seriously",
          "They agreed to leave but returned to the city the following morning"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 19:14"
      },
      {
        "id": "GEN-12-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 19:16 (NIV), what phrase does the text use to explain why the angels physically took hold of Lot and his family to lead them out?",
        "options": [
          "Because the Lord's compassion would not allow them to remain",
          "Because the Lord was merciful to them",
          "Because the angels were commanded to save every righteous soul",
          "Because Abraham had interceded for Lot before the Lord"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 19:16"
      },
      {
        "id": "GEN-12-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 19:1-11 describes the arrival of the two angels in Sodom and the events at Lot's door. Which of the following details is entirely absent from what the text states in that passage?",
        "options": [
          "That Lot bowed down with his face to the ground when he met the angels",
          "That the men of Sodom demanded Lot bring out his guests so they could have relations with them",
          "That the angels struck the men of Sodom with blindness",
          "That Lot offered his daughters to the men of Sodom in place of his guests"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 19:1-11"
      }
    ]
  },

"GEN-13-A": {
    "lessonId": "GEN-13-A",
    "lessonTitle": "Isaac's Birth and the Test",
    "passageRef": "Genesis 20:1-22:24",
    "studyCard": {
      "title": "The Mountain Where God Provides Before You Ask",
      "hook": "Abraham names the mountain Moriah 'The Lord Will Provide' — but the Hebrew is future tense, not past: even after the ram appears, Abraham speaks of provision as something still coming, not merely something that just happened.",
      "teaching": "Genesis 20 opens with a troubling repetition. Abraham arrives in Gerar and again presents Sarah as his sister — the same strategy deployed in Egypt in Genesis 12. This time Abimelech, king of Gerar, takes her. This time God intervenes in a dream, warning Abimelech before anything happens. Abimelech's response is a direct moral challenge to Abraham: 'What have you done to us? What wrong have I done to you that you have brought such great guilt on me and my kingdom?' A pagan king rebukes the father of faith for compromising his wife's safety — for the second time. Abraham's explanation adds a detail not found in the Genesis 12 account: Sarah truly is his half-sister, the daughter of his father though not of his mother. The half-truth that enabled the lie was always technically true. The pattern repeats across generations — Isaac will do the same thing in Genesis 26.\n\nGenesis 21 delivers what has been promised since Genesis 12. 'Now the Lord was gracious to Sarah as he had said, and the Lord did for Sarah what he had promised.' The birth of Isaac is narrated with deliberate economy. After so many chapters of waiting, promise, and near-miss, the actual birth is described in two sentences. The name Isaac — 'he laughs' — now carries the full weight of the journey. Every time this child is called by name, it is a declaration that God kept His word in the face of biological impossibility and human doubt. God is good for His promises.\n\nThe expulsion of Hagar and Ishmael in Genesis 21:9-21 is one of the most emotionally raw passages in Genesis. Sarah demands their removal after seeing Ishmael 'mocking' at the feast for Isaac's weaning. Abraham is distressed — the text explicitly says so. God's instruction to comply is accompanied by a promise: Ishmael too will become a nation, because he is Abraham's son. In the wilderness of Beersheba, when Hagar sets her dying son under a bush and walks away so she does not have to watch him die, God hears the boy crying and speaks — not to Abraham, not to a patriarch with a covenant, but to a slave woman in a desert. 'What is the matter, Hagar? Do not be afraid.' The reach of God's mercy consistently exceeds the boundaries of the covenant.\n\nGenesis 22 — the binding of Isaac, the 'Akedah' in Jewish tradition — is one of the most studied passages in all of religious literature. God commands Abraham to sacrifice Isaac on a mountain in the region of Moriah. What makes this command so devastating is not just the horror of child sacrifice but the theological contradiction it represents: Isaac is the son of promise. Everything God has committed to runs through this child. To sacrifice Isaac is not just to lose a son — it is to lose the future. Abraham's response in verse 5 is extraordinary: he tells his servants 'we will worship and then we will come back to you.' Plural. He fully intends for both of them to return. Hebrews 11:17-19 explains why: Abraham reasoned that God could raise the dead.\n\nThe ram caught in the thicket in Genesis 22:13 is the text's central image. A substitute provided at the last moment, dying in the place of the son who was bound and laid on the altar. The entire sacrificial theology of the Old Testament flows from this moment, and the New Testament identifies it explicitly as the pattern fulfilled in Christ. The location — Moriah — is identified in 2 Chronicles 3:1 as the site where Solomon built the temple. The mountain where God provided the substitute for Abraham's son became the mountain where Israel's entire sacrificial system was established. Geography and theology are inseparable in the Old Testament.",
      "keyVerse": "Abraham looked up and there in a thicket he saw a ram caught by its horns. He went over and took the ram and sacrificed it as a burnt offering instead of his son. — Genesis 22:13 (NIV)",
      "memoryPrompt": "The ram on Moriah is not just a rescue — it is the first substitution in Scripture, and the mountain becomes the temple mount, where substitution becomes a system.",
      "challengeFact": "In Genesis 22:5, Abraham tells his servants 'we will worship and then we will come back to you' — using the plural 'we,' meaning he fully expected Isaac to return with him alive, a detail the book of Hebrews explains by saying Abraham believed God could raise Isaac from the dead."
    },
    "questions": [
      {
        "id": "GEN-13-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 22:2, in which region did God tell Abraham to go and sacrifice Isaac?",
        "options": [
          "The region of Beersheba",
          "The region of Hebron",
          "The region of Moriah",
          "The region of Canaan"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 22:2"
      },
      {
        "id": "GEN-13-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 22:13, what exactly was caught in the thicket that Abraham sacrificed in place of his son?",
        "options": [
          "A lamb caught by its wool",
          "A goat caught by its horns",
          "A ram caught by its horns",
          "A bull caught by its leg"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 22:13"
      },
      {
        "id": "GEN-13-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 22:4, on what day of their journey did Abraham look up and see the place God had told him about?",
        "options": ["The first day", "The second day", "The fifth day", "The third day"],
        "correctAnswer": 3,
        "verseReference": "Genesis 22:4"
      },
      {
        "id": "GEN-13-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 21:9, what did Sarah see Ishmael doing that caused her to demand his expulsion from the household?",
        "options": [
          "Striking Isaac and taking his food",
          "Mocking",
          "Blaspheming the name of God at the feast",
          "Threatening Isaac with violence"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 21:9"
      },
      {
        "id": "GEN-13-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 22:8 (NIV), how does Abraham answer Isaac's question about where the lamb for the burnt offering is?",
        "options": [
          "The Lord will provide for himself the lamb for the burnt offering, my son",
          "God himself will supply what is needed for the offering, my son",
          "The Lord has already prepared a sacrifice for us on the mountain",
          "Do not be afraid, God will show us the animal for the offering"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 22:8"
      },
      {
        "id": "GEN-13-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 22:9-10, what is the correct sequence of Abraham's actions at the place of sacrifice before the angel intervenes?",
        "options": [
          "Built the altar → arranged the wood → bound Isaac → laid him on the altar → took the knife",
          "Bound Isaac → built the altar → arranged the wood → laid Isaac on top → reached for the knife",
          "Arranged the wood → built the altar → bound Isaac → raised the knife → laid Isaac down",
          "Built the altar → bound Isaac → arranged him on the wood → raised the knife to slay him"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 22:9-10"
      },
      {
        "id": "GEN-13-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 20:1-18 records Abraham's deception of Abimelech. Which of the following details, often assumed to be part of this account, is entirely absent from the text of Genesis 20?",
        "options": [
          "That God warned Abimelech in a dream before he touched Sarah",
          "That Abimelech rebuked Abraham for what he had done",
          "That God inflicted plagues on Abimelech's household",
          "That Abraham received sheep, cattle, and servants from Abimelech"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 20:1-18"
      }
    ]
  },

 "GEN-14-A": {
    "lessonId": "GEN-14-A",
    "lessonTitle": "Sarah's Death and Isaac's Wife",
    "passageRef": "Genesis 23:1-25:18",
    "studyCard": {
      "title": "The Field Abraham Refused to Receive for Free",
      "hook": "Abraham could have accepted the cave of Machpelah as a gift — the Hittites offered it twice — but his insistence on paying full price was a legal act of permanent territorial claim, not a matter of personal pride.",
      "teaching": "Sarah's death in Genesis 23:1-2 is the first death of a named woman recorded in Scripture, and Abraham's response is both grief and action. He mourns and weeps — the text does not minimise the emotion — and then he rises and negotiates. The negotiation for the cave of Machpelah is one of the most detailed commercial transactions in the entire Old Testament, and it reads like a legal document because that is precisely what it is. In ancient Near Eastern custom, a witnessed, publicly negotiated land purchase at the city gate established irrefutable title. The Hittites offer the land as a gift twice. Abraham refuses twice. He insists on paying the full market price, publicly, with witnesses, at the city gate.\n\nThe reason for Abraham's insistence is both practical and theological. As a 'foreigner and stranger' in Canaan — his own words in Genesis 23:4 — Abraham has no legal land rights. A gift can be revoked. A gift creates obligation and social debt. But a purchase at full market price, conducted publicly before the elders at the city gate, creates permanent, documented, legally defensible title. Abraham is not buying a burial plot. He is buying the first piece of the Promised Land. The transaction is the first concrete, legally secured foothold of what God promised in Genesis 12. Sarah's death becomes the occasion for the first territorial fulfilment of the covenant.\n\nGenesis 24 is the longest single chapter in Genesis, and it is devoted entirely to finding a wife for Isaac. This is not a romantic subplot. In the ancient world, marriage was the mechanism by which covenant lineage was preserved or broken. The wrong wife would mean the wrong descendants, the dilution of the covenant line, absorption into Canaanite culture. Abraham's servant — unnamed throughout the chapter, thought by many scholars to be Eliezer of Damascus mentioned in Genesis 15:2 — is given a task with a double condition: go to Abraham's homeland, find a wife from his own people, but do not under any circumstances take Isaac back there. The covenant people must stay in the covenant land.\n\nThe servant's prayer in Genesis 24:12-14 is one of the first recorded intercessory prayers in Scripture, and it is strikingly specific. He asks God to identify the right woman by a particular sign: she will not only give him water but will also offer to water his camels. Rebekah arrives before he finishes praying. She fulfills the sign completely, and then reveals she is from Abraham's family. The servant bows his head and worships before the words of recognition have finished leaving his mouth. The speed and precision of divine guidance in this chapter is the theological point: when God is working toward His purposes, the path opens before you ask.\n\nGenesis 25:1-11 closes Abraham's life and Genesis 25:12-18 gives Ishmael's genealogy before pivoting to Isaac. Abraham dies at 175, buried by both Isaac and Ishmael together in the cave of Machpelah — the same field he purchased for Sarah. The two brothers who were separated in life stand together at their father's grave. And Ishmael's twelve princes in Genesis 25:13-16 precisely mirror the twelve tribes of Israel that will come from Jacob. Even the line that was not the covenant line receives its fullness. God's promises, once made, do not expire.",
      "keyVerse": "I am a foreigner and stranger among you. Sell me some property for a burial site here so I can bury my dead. — Genesis 23:4 (NIV)",
      "memoryPrompt": "Abraham refused the free land because a gift can be revoked — a purchase at the city gate created legal title to the first piece of the Promised Land.",
      "challengeFact": "The cave of Machpelah, purchased by Abraham in Genesis 23, became the burial site for Abraham, Sarah, Isaac, Rebekah, Jacob, and Leah — making it the most significant family tomb in all of Scripture and the first legally purchased land in Israel's history."
    },
    "questions": [
      {
        "id": "GEN-14-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 23:15-16, how much did Abraham pay for the field of Machpelah, and in what form?",
        "options": [
          "Four hundred shekels of silver, the current commercial rate",
          "Three hundred shekels of gold at the merchant's standard",
          "Five hundred shekels of silver weighed at the city gate",
          "Four hundred pieces of silver at the weight the king used"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 23:15-16"
      },
      {
        "id": "GEN-14-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 25:7, how many years did Abraham live in total?",
        "options": ["150 years", "175 years", "180 years", "200 years"],
        "correctAnswer": 1,
        "verseReference": "Genesis 25:7"
      },
      {
        "id": "GEN-14-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 24:15, who was Rebekah's father, and who was her grandfather, establishing her connection to Abraham's family?",
        "options": [
          "Her father was Laban and her grandfather was Nahor",
          "Her father was Bethuel and her grandfather was Nahor",
          "Her father was Nahor and her grandfather was Terah",
          "Her father was Bethuel and her grandfather was Milkah's husband"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 24:15"
      },
      {
        "id": "GEN-14-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 24:22, what two gifts did Abraham's servant give Rebekah after she drew water for his camels?",
        "options": [
          "A gold ring and two gold bracelets",
          "A gold nose ring and two gold bracelets",
          "Silver earrings and a necklace of gold",
          "A nose ring and silver bangles for her wrists"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 24:22"
      },
      {
        "id": "GEN-14-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHEN",
        "question": "According to Genesis 24:67, what did Isaac do when Rebekah became his wife, and what significance does the text attach to this?",
        "options": [
          "He loved her and was comforted after his father Abraham's death",
          "He loved her and was comforted after his mother Sarah's death",
          "He married her and found peace in his father's tent once more",
          "He brought her into his home and was glad before the Lord"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 24:67"
      },
      {
        "id": "GEN-14-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 23:3-16, what is the correct sequence of the negotiation between Abraham and Ephron the Hittite for the cave of Machpelah?",
        "options": [
          "Abraham requested a burial site → Hittites offered any tomb → Abraham asked for Ephron's cave → Ephron offered it free → Abraham insisted on paying → Ephron named the price → Abraham paid in full",
          "Abraham wept → asked for the cave by name → Ephron named a price → Abraham paid immediately → transaction recorded",
          "Abraham asked for a burial site → Ephron offered the cave free → Abraham paid without negotiating → Hittites witnessed → transaction sealed",
          "Hittites offered Abraham any tomb → Abraham named the cave of Machpelah → Ephron immediately named a price → Abraham accepted → paid at the gate"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 23:3-16"
      },
      {
        "id": "GEN-14-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 25:9 records the burial of Abraham. Which of the following details, commonly assumed about Abraham's burial, is NOT stated in the text of Genesis 25:7-10?",
        "options": [
          "That Abraham was buried in the cave of Machpelah",
          "That Isaac and Ishmael buried their father together",
          "That Abraham was gathered to his people",
          "That Sarah was reinterred alongside Abraham at the time of his burial"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 25:7-10"
      }
    ]
  },

 "GEN-15-A": {
    "lessonId": "GEN-15-A",
    "lessonTitle": "Jacob and Esau",
    "passageRef": "Genesis 25:19-28:22",
    "studyCard": {
      "title": "The Blessing That Was Stolen and the God Who Honoured It Anyway",
      "hook": "Jacob deceives his father and steals his brother's blessing through an elaborate lie — and yet God at Bethel treats the stolen blessing as valid and builds His entire covenant programme through the man who took it by fraud.",
      "teaching": "The birth of Jacob and Esau in Genesis 25:19-26 is framed by a divine oracle that overturns every expectation of ancient Near Eastern primogeniture. Rebekah, troubled by the struggling in her womb, inquires of God and receives an answer that will determine the next two generations: 'Two nations are in your womb, and two peoples from within you will be separated; one people will be stronger than the other, and the older will serve the younger.' The reversal is declared before the children are born, before either can demonstrate merit or failure. This is not divine favouritism based on foreseen virtue — Paul makes this explicit in Romans 9:11-12, noting that the choice was made 'before the twins were born or had done anything good or bad.' Election in the Bible is not about who deserves it.\n\nThe sale of the birthright in Genesis 25:29-34 is one of the most studied character studies in the Bible. Esau returns from hunting, famished, and demands the red stew Jacob is preparing. Jacob's response is calculated: 'First sell me your birthright.' Esau's reply is the most alarming sentence in the passage: 'What good is the birthright to me?' He is hungry now. The birthright is a future reality. He despises it — the text uses that specific word in verse 34. Hebrews 12:16 will identify Esau as 'godless' for this trade, not because he was hungry, but because he was willing to trade permanent, covenant-bearing inheritance for immediate physical satisfaction. The bowl of stew is not the problem. The 'what good is it to me' is the problem.\n\nThe deception of Isaac in Genesis 27 is difficult to read without discomfort. Rebekah engineers the deception; Jacob carries it out. Isaac, blind and old, is deceived by goat-skin on Jacob's hands and Esau's clothing on his body. Jacob lies directly when his father asks: 'Are you really my son Esau?' — 'I am.' The blessing is given. When Esau arrives and the truth is revealed, Isaac trembles violently, Esau weeps and begs, and yet Isaac says: 'I blessed him — and indeed he will be blessed.' The blessing cannot be revoked. In the ancient world, a spoken covenant blessing was legally and spiritually binding. The deception is real; the consequence is also real. God will use the stolen blessing, but Jacob's path forward will be shaped by the fractures his deception created.\n\nJacob's dream at Bethel in Genesis 28:10-22 is one of the great theophanies of the Old Testament. Fleeing Esau, alone, sleeping with a stone for a pillow, he dreams of a staircase reaching to heaven with angels ascending and descending. The Lord stands at the top and repeats the Abrahamic covenant to Jacob directly — the land, the descendants, the blessing to all nations. Jacob wakes terrified: 'Surely the Lord is in this place, and I was not aware of it.' He calls it 'the gate of heaven.' In John 1:51, Jesus will apply this image to Himself — 'you will see the angels of God ascending and descending on the Son of Man.' Jesus claims to be the true ladder between heaven and earth, the real Bethel, the place where God and humanity meet.",
      "keyVerse": "Your name will no longer be Jacob, but Israel, because you have struggled with God and with humans and have overcome. — Genesis 32:28 (NIV)",
      "memoryPrompt": "Jacob stole the blessing and ran from his brother — and God met him alone in the dark and gave it to him again legitimately.",
      "challengeFact": "In Genesis 25:25, Esau is described as coming out red and covered with hair — and the text notes that he was named Esau, while 'Edom' meaning 'red' is attached to him later through the red stew incident, making his very physical appearance at birth a foreshadowing of his character and fate."
    },
    "questions": [
      {
        "id": "GEN-15-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 25:30-31, what did Jacob demand from Esau in exchange for the red stew?",
        "options": [
          "His firstborn rights over the flocks and herds",
          "His birthright",
          "His share of Isaac's inheritance",
          "His right to receive the blessing of the firstborn"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 25:31"
      },
      {
        "id": "GEN-15-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 28:19, what did Jacob name the place where he had his dream of the staircase to heaven?",
        "options": ["Peniel", "Mahanaim", "Bethel", "Mizpah"],
        "correctAnswer": 2,
        "verseReference": "Genesis 28:19"
      },
      {
        "id": "GEN-15-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 25:23 (NIV), what did God tell Rebekah about the two nations in her womb — specifically, what would the relationship between the older and the younger be?",
        "options": [
          "The firstborn will bow down and the younger will rule",
          "The older will serve the younger",
          "The stronger will overcome the weaker from the beginning",
          "The younger will be blessed and the older will be cursed"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 25:23"
      },
      {
        "id": "GEN-15-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 27:9-10, whose idea was the plan to disguise Jacob and deceive Isaac into giving Jacob the blessing?",
        "options": [
          "It was Jacob's own plan, which he proposed to Rebekah",
          "It was a plan devised by both Rebekah and Jacob together",
          "It was Rebekah's plan, which she instructed Jacob to carry out",
          "It was suggested by Laban, Rebekah's brother, from a distance"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 27:9-10"
      },
      {
        "id": "GEN-15-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 28:12, what did Jacob see in his dream at Bethel?",
        "options": [
          "A ladder set up on the earth with angels standing beside it",
          "A stairway resting on the earth with its top reaching to heaven, with angels ascending and descending on it",
          "A pillar of fire reaching to the sky with the Lord standing atop it",
          "A great tree touching heaven with angels resting in its branches"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 28:12"
      },
      {
        "id": "GEN-15-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 27:18-24, when Jacob came to his father to receive the blessing, what is the correct sequence of Isaac's questions and Jacob's responses?",
        "options": [
          "Isaac asked who was there → Jacob said he was Esau → Isaac asked how he found game so quickly → Jacob said God gave him success → Isaac asked him to come near → felt him → asked if he was really Esau → Jacob confirmed it",
          "Isaac asked if it was Esau → Jacob confirmed → Isaac asked him to come near → felt the hands → said the voice was Jacob's → blessed him without further question",
          "Isaac felt Jacob's hands first → then asked his name → Jacob said he was Esau → Isaac asked about the game → Jacob lied → Isaac blessed him",
          "Jacob announced himself → Isaac asked about the game → Jacob lied → Isaac asked him to come near to kiss him → blessed him immediately"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 27:18-24"
      },
      {
        "id": "GEN-15-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 28:13-15 records what God said to Jacob at Bethel. Which of the following elements of the Abrahamic covenant is notably absent from what God states to Jacob specifically in those three verses?",
        "options": [
          "That God would give Jacob and his descendants the land on which he was lying",
          "That his descendants would be like the dust of the earth",
          "That all peoples on earth would be blessed through Jacob and his offspring",
          "That the covenant sign of circumcision would be renewed in Jacob's line"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 28:13-15"
      }
    ]
  },

"GEN-16-A": {
    "lessonId": "GEN-16-A",
    "lessonTitle": "Jacob's Wives and Sons",
    "passageRef": "Genesis 29:1-31:55",
    "studyCard": {
      "title": "The Deceiver Deceived",
      "hook": "Jacob spent seven years working for Rachel — and on the morning after his wedding night discovered he had married the wrong woman, experiencing in one night precisely the deception he had performed on his own father.",
      "teaching": "Genesis 29 opens with Jacob arriving at a well in Harran and meeting Rachel — and the scene is deliberately constructed to echo Isaac's servant meeting Rebekah at a well in Genesis 24. The structural echo is intentional: covenant brides are found at wells in Genesis. Jacob's immediate response to Rachel is physical, emotional, and decisive — he kisses her and weeps aloud before he has spoken a word of negotiation. This is not how ancient Near Eastern betrothal arrangements worked. Emotion has arrived before propriety, a detail that will characterise Jacob's relationship with Rachel throughout.\n\nLaban's deception of Jacob in Genesis 29:21-25 is one of the Bible's most deliberately ironic moments. Jacob, who disguised himself as Esau to deceive his blind father, now receives a veiled bride in darkness who is not who he was promised. The word 'behold' in verse 25 — 'when morning came, behold, it was Leah' — is the same shock of revelation that Isaac experienced when Esau returned and the deception became clear. Jacob's outraged question to Laban — 'Why have you deceived me?' — is painfully ironic given his own history. Laban's answer about the custom of the firstborn being married before the younger is a deliberate echo of Jacob's own sin against his firstborn brother Esau.\n\nThe naming of Jacob's sons in Genesis 29:31-30:24 is a theological narrative disguised as a birth record. Every name carries the emotional weight of the moment of birth — Leah's names reflect her longing for Jacob's love; Rachel's reflect the anguish of barrenness. Reuben means 'see, a son' because 'the Lord has seen my misery.' Simeon means 'hearing' because 'the Lord heard.' Levi means 'attachment,' Judah means 'praise.' The births are not merely genealogical entries. They are a running commentary on two women in a painful household, each one reaching toward God in her own way. And out of this fractured, competitive family, the twelve tribes of Israel will emerge.\n\nRachel's barrenness, like Sarah's before her, is not incidental. It is the pattern through which God works throughout Genesis: the covenant line is consistently produced through the humanly impossible. When Rachel finally conceives Joseph in Genesis 30:22-24, the text is precise: 'God remembered Rachel; he listened to her and enabled her to conceive.' The same language — 'God remembered' — was used in Genesis 8:1 for Noah and will be used in Exodus 2:24 for Israel in Egypt. Divine remembering in these narratives is always the beginning of a new chapter.\n\nJacob's departure from Laban in Genesis 31 is complicated by two things: the negotiation over his wages, which God turns to Jacob's favour through the unusual breeding arrangements, and Rachel's theft of Laban's household gods. The theft of the 'teraphim' is more than petty theft — in ancient Near Eastern law, possession of the household gods was linked to inheritance rights. Rachel may have been securing Jacob's claim on Laban's estate. Laban's frantic search for them ends with Rachel sitting on the saddlebag containing them and claiming she cannot rise because of her monthly period — an act of concealment using her own body. The covenant heap of stones at the end of Genesis 31 — Mizpah, 'may the Lord watch between you and me when we are absent from each other' — sounds devotional but functions legally: it is a boundary marker and a treaty of separation.",
      "keyVerse": "When the Lord saw that Leah was not loved, he enabled her to conceive, but Rachel remained childless. — Genesis 29:31 (NIV)",
      "memoryPrompt": "Jacob deceived his father by disguising himself — and Laban deceived Jacob by disguising his daughter, using the very logic of the firstborn Jacob had violated.",
      "challengeFact": "Rachel's theft of Laban's household gods in Genesis 31:19 was not mere mischief — in ancient Near Eastern law, possession of a father's household gods constituted a legal claim to inheritance rights over his estate, making her act a strategic move to secure Jacob's claim on Laban's property."
    },
    "questions": [
      {
        "id": "GEN-16-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 29:20, how many years did Jacob work for Laban in exchange for Rachel — and how did they seem to him?",
        "options": [
          "Ten years, but they seemed like many because of his love for her",
          "Seven years, but they seemed like only a few days to him",
          "Fourteen years, which seemed short because of his love for her",
          "Seven years, which seemed like a lifetime of waiting"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 29:20"
      },
      {
        "id": "GEN-16-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHO",
        "question": "According to Genesis 29:24 and 29:29, what were the names of the servants Laban gave to his two daughters at their respective marriages?",
        "options": [
          "Zilpah was given to Leah and Bilhah was given to Rachel",
          "Bilhah was given to Leah and Zilpah was given to Rachel",
          "Hagar was given to Leah and Zilpah was given to Rachel",
          "Zilpah was given to Rachel and Bilhah was given to Leah"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 29:24, 29:29"
      },
      {
        "id": "GEN-16-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 30:14-15, what did Reuben find in the fields, and what did Rachel trade Leah in exchange for them?",
        "options": [
          "Reuben found wild grain; Rachel traded her right to Jacob's company that night",
          "Reuben found mandrakes; Rachel traded a night with Jacob to Leah in exchange for them",
          "Reuben found mandrakes; Rachel traded her silver jewellery for them",
          "Reuben found rare herbs; Rachel traded Leah a portion of Jacob's wages"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 30:14-15"
      },
      {
        "id": "GEN-16-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 31:21, which direction did Jacob flee when he left Laban, and toward what destination?",
        "options": [
          "He fled south toward Canaan, heading for Beersheba",
          "He crossed the Euphrates and headed for the hill country of Gilead",
          "He headed west toward the land of Canaan by the coastal road",
          "He fled east toward the land of the Kedamites"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 31:21"
      },
      {
        "id": "GEN-16-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 29:31 (NIV), what two things does the text state simultaneously about Leah's status and God's response?",
        "options": [
          "Leah was unloved and God opened her womb; Rachel was loved but remained barren",
          "Leah was not loved and God enabled her to conceive; Rachel remained childless",
          "Leah was hated and God blessed her; Rachel was beloved but her womb was closed",
          "Leah was neglected and God gave her sons; Rachel was favoured but bore no children"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 29:31"
      },
      {
        "id": "GEN-16-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "Genesis 29:32-35 records the births and namings of Leah's first four sons. What is the correct sequence of their names?",
        "options": [
          "Reuben, Simeon, Levi, Judah",
          "Simeon, Reuben, Judah, Levi",
          "Reuben, Levi, Simeon, Judah",
          "Judah, Reuben, Simeon, Levi"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 29:32-35"
      },
      {
        "id": "GEN-16-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 31:44-49 records the covenant between Jacob and Laban at Mizpah. Which of the following is entirely absent from what the text states Laban said about the purpose of the Mizpah declaration in verse 49?",
        "options": [
          "That the Lord would watch between them when they were absent from each other",
          "That it served as a boundary marker neither would cross to harm the other",
          "That the heap of stones would be a witness between them",
          "That it was a blessing pronounced on their children and grandchildren"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 31:44-49"
      }
    ]
  },

 "GEN-17-A": {
    "lessonId": "GEN-17-A",
    "lessonTitle": "Jacob Wrestles and Returns",
    "passageRef": "Genesis 32:1-36:43",
    "studyCard": {
      "title": "The Man Who Wrestled Until Dawn and Left Limping",
      "hook": "Jacob wrestles with God all night and wins — but the victory costs him the use of his hip, meaning the man who finally overcomes leaves the encounter unable to walk without pain for the rest of his life.",
      "teaching": "Genesis 32 begins with Jacob's fear and ends with his transformation, and between those two poles is one of the most unusual and theologically rich encounters in the entire Old Testament. Returning to Canaan after twenty years, Jacob hears that Esau is approaching with four hundred men. His response is meticulous and desperate simultaneously — he divides his people and flocks into two camps, prays with genuine humility acknowledging he is 'unworthy of all the kindness and faithfulness' God has shown him, and then sends wave after wave of gifts ahead to appease Esau. The man who once seized things by cunning and deception is now sending everything forward as an offering.\n\nThe wrestling match at the Jabbok ford in Genesis 32:22-32 operates on multiple levels that a single reading cannot exhaust. Jacob sends everyone across the river and remains alone — the only man left on his side. A 'man' wrestles with him until daybreak. The identity of this figure unfolds gradually: he cannot overpower Jacob, he touches Jacob's hip and dislocates it with a touch, he asks to be let go at dawn, he gives Jacob a new name, and Jacob names the place 'Peniel' saying 'I saw God face to face and yet my life was spared.' In Hosea 12:4, the prophet identifies this figure as an angel who was also God. The ambiguity is not accidental — it reflects the experience itself, the terrifying intimacy of an encounter with the divine that is simultaneously crushing and life-giving.\n\nThe name change from Jacob to Israel is the hinge of the entire narrative. 'Jacob' means 'he grasps the heel' or 'he deceives' — it is the name his character earned at birth and lived up to consistently. 'Israel' means 'he struggles with God' or 'God struggles' — it is the name of a man who has been through enough with God to wrestle, who can no longer be defined by cunning alone but by authentic, painful, costly encounter. The name change does not erase the past; Jacob's old name appears throughout the rest of Genesis. But the identity declared at the Jabbok is the one that becomes a nation.\n\nThe reunion with Esau in Genesis 33 is one of the most redemptive moments in Genesis. Jacob, expecting violence, bows seven times as he approaches. But Esau 'ran to meet him and embraced him; he threw his arms around his neck and kissed him. And they wept.' No confrontation. No demand for restitution. The brother who had sworn to kill him runs toward him and weeps. Jesus will use precisely this image — the father running, throwing his arms, kissing — in the parable of the prodigal son in Luke 15. Esau's welcome of his brother becomes the template for the Father's welcome of the returning sinner.\n\nGenesis 34-36 covers the violence at Shechem, the deaths of Deborah and Rachel, and Esau's extensive genealogy. Rachel dies giving birth to Benjamin — her last words name the boy 'Ben-Oni,' meaning 'son of my trouble.' Jacob renames him Benjamin, 'son of my right hand.' The renaming is an act of love — a father refusing to let his son carry his mother's dying grief as his identity. The same instinct that renamed Israel from Jacob now renames the last son of Rachel.",
      "keyVerse": "So Jacob called the place Peniel, saying, 'It is because I saw God face to face, and yet my life was spared.' — Genesis 32:30 (NIV)",
      "memoryPrompt": "Jacob won the wrestling match but left limping — because every true encounter with God changes your walk for the rest of your life.",
      "challengeFact": "After the wrestling match, Genesis 32:31 records that the sun rose as Jacob crossed over Peniel — and he was limping because of his hip, meaning from that moment forward the patriarch whose name became Israel walked with a permanent physical reminder of the night he met God."
    },
    "questions": [
      {
        "id": "GEN-17-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 33:1, how many men was Esau accompanied by when he approached to meet Jacob on his return?",
        "options": ["Two hundred men", "Four hundred men", "One hundred men", "Three hundred men"],
        "correctAnswer": 1,
        "verseReference": "Genesis 33:1"
      },
      {
        "id": "GEN-17-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 32:25, what did the man do to Jacob during their wrestling match that caused a physical injury?",
        "options": [
          "He struck Jacob on the shoulder and dislocated it",
          "He touched the socket of Jacob's hip so that it was wrenched",
          "He threw Jacob to the ground and broke his leg",
          "He gripped Jacob's side and caused him to cry out"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 32:25"
      },
      {
        "id": "GEN-17-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 32:28 (NIV), what reason does the man give for changing Jacob's name to Israel?",
        "options": [
          "Because God has chosen you above all others and your name will be great",
          "Because you have struggled with God and with humans and have overcome",
          "Because you have prevailed against the angel and your prayer has been heard",
          "Because you sought God's face and were found worthy of a new beginning"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 32:28"
      },
      {
        "id": "GEN-17-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 32:22, where did the wrestling match between Jacob and the man take place?",
        "options": [
          "At the ford of the Jordan, near the city of Jericho",
          "At the ford of the Jabbok",
          "At the crossing of the Euphrates near Harran",
          "At the shallow crossing of the river near Bethel"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 32:22"
      },
      {
        "id": "GEN-17-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 35:8, who died and was buried under the oak tree below Bethel, and what was the tree then called?",
        "options": [
          "Rachel's nurse Zilpah died and the oak was called the Oak of Weeping",
          "Deborah, Rebekah's nurse, died and was buried under the Oak of Weeping",
          "Leah's handmaid died and the tree was named in her memory",
          "Rebekah herself died there and the tree was called the Oak of Mourning"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 35:8"
      },
      {
        "id": "GEN-17-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 35:16-20, what is the correct sequence of events surrounding Rachel's death?",
        "options": [
          "Rachel went into labour → midwife encouraged her → Rachel named the baby Ben-Oni → Rachel died → Jacob renamed him Benjamin → Rachel buried on the road to Ephrath",
          "Rachel died → Jacob buried her → named the baby Benjamin → set up a pillar → the midwife encouraged her",
          "Labour began → Rachel named the baby Benjamin → Rachel died → Jacob renamed him Ben-Oni → buried on the road",
          "Midwife encouraged Rachel → Rachel named baby Ben-Oni → Jacob renamed him → Rachel died → buried at Bethlehem"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 35:16-20"
      },
      {
        "id": "GEN-17-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 32:24-30 describes Jacob's wrestling match. Which of the following details commonly associated with this event is entirely absent from the text of those verses?",
        "options": [
          "That the wrestling continued until the breaking of dawn",
          "That the man asked Jacob to release him when morning came",
          "That Jacob demanded a blessing before he would let the man go",
          "That the man revealed his own name to Jacob before departing"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 32:24-30"
      }
    ]
  },

"GEN-18-A": {
    "lessonId": "GEN-18-A",
    "lessonTitle": "Joseph Sold and Rises in Egypt",
    "passageRef": "Genesis 37:1-41:57",
    "studyCard": {
      "title": "The Pit, the Prison, and the Throne",
      "hook": "Joseph's brothers throw him into a pit with the intention of killing him — and within twenty years, that same man is second in command of the most powerful empire on earth, placed there by the very suffering they intended as his destruction.",
      "teaching": "Genesis 37 introduces Joseph as Jacob's favourite son — 'Israel loved Joseph more than any of his other sons' — and the ornamented robe is the visible evidence of that preference. The brothers' hatred is not irrational; it is the predictable product of parental favouritism displayed publicly and daily. But the text adds two more provocations entirely of Joseph's own making: he brings a bad report about his brothers to their father, and he tells them his dreams — twice. The first dream places his brothers' sheaves bowing to his. The second places the sun, moon, and eleven stars bowing to him. Even Jacob rebukes him for the second one. Joseph is not wrong about the dreams; they are genuinely prophetic. But his timing and delivery reveal a seventeen-year-old with no wisdom about how truth lands when there is no love in the room.\n\nThe mechanics of the betrayal in Genesis 37:18-28 involve a detail that most readers miss. It is not all the brothers who act with unified intent. When Reuben hears their plan to kill Joseph, he intervenes and suggests throwing Joseph into the cistern instead — intending to come back and rescue him. While Reuben is absent, Judah suggests selling Joseph to the Ishmaelite traders instead of killing him. Two brothers act as reluctant brakes on the worst impulse. Neither achieves what they intend: Reuben returns to find the pit empty and tears his clothes, while Judah has already sold his brother into slavery. The story of Joseph's suffering is not a simple tale of unanimous villainy.\n\nGenesis 39 is one of the finest character studies in all of Scripture. Joseph, a slave in Potiphar's house, rises to complete authority over the household because 'the Lord was with him.' Potiphar's wife attempts to seduce him daily. Joseph's refusal is theological: 'How then could I do such a wicked thing and sin against God?' — not fear of Potiphar, not self-interest, but God. When she falsely accuses him and he is imprisoned, the text immediately repeats the refrain: 'the Lord was with Joseph and showed him kindness.' Twice thrown into confinement — the pit and the prison — and twice the text insists God is present in the confinement. The presence of God is not contingent on circumstances.\n\nThe dreams of the cupbearer and baker in Genesis 40, and Pharaoh's dreams in Genesis 41, form a paired structure: two servants, two dreams, two outcomes. Then two years of waiting after the cupbearer is restored and forgets Joseph. The forgetting is painful but purposeful — it means Joseph is still in prison when Pharaoh dreams, when no one in Egypt can interpret the dreams, and when the cupbearer finally remembers. The timing could not have been engineered by human hands. Joseph is brought before Pharaoh and immediately deflects all credit: 'I cannot do it, but God will give Pharaoh the answer he desires.' The man who was once boasting his dreams to his brothers now attributes everything to God.\n\nJoseph's elevation in Genesis 41:39-44 is breathtaking in its totality. In a single audience with Pharaoh, the former slave and prisoner becomes second only to Pharaoh over all of Egypt. Pharaoh puts his own signet ring on Joseph's finger, dresses him in fine linen, puts a gold chain around his neck, and has him ride in his second chariot with people shouting before him. He is given an Egyptian name — Zaphenath-Paneah — and an Egyptian wife. The boy thrown into a pit is now ruling the empire that will one day enslave his descendants. Genesis is constantly telling the same story: what humans intend for destruction, God turns toward purposes they cannot see.",
      "keyVerse": "You intended to harm me, but God intended it for good to accomplish what is now being done, the saving of many lives. — Genesis 50:20 (NIV)",
      "memoryPrompt": "Joseph was in the pit, then the prison, and then the throne — and God was present in all three places, even when Joseph couldn't see it.",
      "challengeFact": "Genesis 37:21-22 reveals that it was Reuben, not Judah, who first intervened to save Joseph's life by suggesting the pit rather than murder — with the private intention of rescuing him later. Most people attribute Joseph's survival entirely to Judah's idea to sell him, missing Reuben's prior intervention entirely."
    },
    "questions": [
      {
        "id": "GEN-18-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 37:2, how old was Joseph when he brought the bad report about his brothers to their father?",
        "options": ["Fifteen years old", "Seventeen years old", "Twenty years old", "Twelve years old"],
        "correctAnswer": 1,
        "verseReference": "Genesis 37:2"
      },
      {
        "id": "GEN-18-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHO",
        "question": "According to Genesis 37:26-27, which brother suggested selling Joseph to the Ishmaelites rather than killing him?",
        "options": ["Reuben", "Simeon", "Levi", "Judah"],
        "correctAnswer": 3,
        "verseReference": "Genesis 37:26-27"
      },
      {
        "id": "GEN-18-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 37:28, for how many pieces of silver was Joseph sold to the Ishmaelite traders?",
        "options": ["Thirty pieces of silver", "Twenty pieces of silver", "Forty pieces of silver", "Fifty pieces of silver"],
        "correctAnswer": 1,
        "verseReference": "Genesis 37:28"
      },
      {
        "id": "GEN-18-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 39:6-7, what caused Potiphar's wife to notice and desire Joseph?",
        "options": [
          "His great wisdom and the reports of his ability to interpret dreams",
          "His skill in managing the household and his growing authority",
          "His being well-built and handsome in form and appearance",
          "His favour with Pharaoh's court, which brought him into her presence"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 39:6"
      },
      {
        "id": "GEN-18-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 41:16 (NIV), when Pharaoh told Joseph he had heard he could interpret dreams, what was Joseph's immediate response?",
        "options": [
          "The Lord has given me this gift and I will interpret it for the glory of God",
          "I cannot do it, but God will give Pharaoh the answer he desires",
          "It is not in my power alone, but the Lord who is with me will reveal it",
          "God has shown me many dreams and He will show Pharaoh's meaning too"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 41:16"
      },
      {
        "id": "GEN-18-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 41:41-44, what is the correct sequence of honours Pharaoh conferred on Joseph at his elevation?",
        "options": [
          "Pharaoh put his signet ring on Joseph's finger → dressed him in fine linen → put a gold chain around his neck → had him ride in the second chariot",
          "Pharaoh gave Joseph a gold chain → put his ring on his finger → dressed him in linen → gave him an Egyptian name → had him ride in the chariot",
          "Pharaoh declared Joseph second in command → gave him the ring → gold chain → linen garments → chariot → Egyptian name → wife",
          "Pharaoh dressed Joseph in linen → gave him the ring → chain → chariot → Egyptian name"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 41:41-44"
      },
      {
        "id": "GEN-18-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 40:14-15 records Joseph's request to the cupbearer before his release. Which of the following details is absent from what Joseph specifically asks the cupbearer to do for him?",
        "options": [
          "That the cupbearer mention him to Pharaoh",
          "That the cupbearer help get him out of prison",
          "That the cupbearer bring Joseph a written petition before Pharaoh's court",
          "That Joseph had been forcibly carried off from the land of the Hebrews"
        ],
        "correctAnswer": 2,
        "verseReference": "Genesis 40:14-15"
      }
    ]
  },

 "GEN-19-A": {
    "lessonId": "GEN-19-A",
    "lessonTitle": "Joseph and His Brothers",
    "passageRef": "Genesis 42:1-47:31",
    "studyCard": {
      "title": "The Test Behind the Test",
      "hook": "Joseph tests his brothers three times before revealing himself — and the test is not about whether they recognise him; it is about whether they are the same men who sold him, or different ones.",
      "teaching": "When Jacob's sons arrive in Egypt for grain, Joseph recognises them immediately — but they do not recognise him. The gap between those two facts is the engine of Genesis 42-44. Joseph is not prolonging a reunion out of cruelty or revenge. He is administering a deliberate test, and what he is testing for is specific: have his brothers changed? The key diagnostic is Benjamin. Benjamin is the only other son of Rachel, the only full brother of Joseph, the new favourite of the grieving Jacob. If the brothers will treat Benjamin the way they treated Joseph — sell him, abandon him, lie about it — then nothing has changed. If they will sacrifice themselves for Benjamin, everything has changed.\n\nThe guilt mechanism in Genesis 42:21-24 is one of the most psychologically acute passages in the entire Old Testament. When Joseph has them thrown in prison for three days, the brothers immediately say to one another: 'Surely we are being punished because of our brother. We saw how distressed he was when he pleaded with us for his life, but we would not listen.' This is the first time in the narrative we are told that Joseph pleaded with his brothers while in the pit. He was not silent when they sold him — he cried out and they ignored him. The detail lands twenty years later in a foreign prison with devastating force. Joseph, listening to his brothers confess in Hebrew, turns away and weeps. He has heard what he needed to hear: they remember, they know, they feel the weight of it.\n\nThe scene in Genesis 43-44 involving Judah is one of the great redemption arcs in Scripture. When Joseph plants his silver cup in Benjamin's sack and has the brothers brought back, and Benjamin is identified as the guilty one, it is Judah who steps forward to speak. His speech in Genesis 44:18-34 is the longest speech by any human character in the book of Genesis. He recounts everything Jacob has suffered. He explains that Benjamin's absence will kill their father. And then he offers himself — 'let your servant remain here as my lord's slave in place of the boy, and let the boy return with his brothers.' This is the same Judah who once said 'what will we gain if we kill our brother?' and sold him. Now he is offering his own life to prevent the same thing happening to Benjamin. The transformation is complete.\n\nJoseph's revelation of himself to his brothers in Genesis 45:1-15 is the emotional apex of the entire Joseph narrative and one of the most moving scenes in the Bible. He clears the room of all Egyptians, weeps so loudly that Pharaoh's household hears him, and says 'I am Joseph! Is my father still living?' Five words that collapse twenty years of separation into a single moment. His immediate theological interpretation of events — 'it was not you who sent me here, but God' — is not a denial of his brothers' guilt; it is a declaration that God's purposes were operating through and beyond their sin simultaneously. Both things are true at once: they did it, and God sent him.\n\nGenesis 46-47 describes the migration of Jacob's entire family to Egypt — seventy people in total. Jacob's arrival produces one of the most tender scenes in the narrative: 'Joseph had his chariot made ready and went to Goshen to meet his father Israel. As soon as Joseph appeared before him, he threw his arms around his father and wept for a long time.' Jacob says: 'Now I am ready to die, since I have seen for myself that you are still alive.' The son he mourned as dead is alive and ruling Egypt. The family that fractured over a coloured robe is reunited in the richest province of the world's greatest empire. The providence of God does not move in straight lines, but it moves.",
      "keyVerse": "You intended to harm me, but God intended it for good to accomplish what is now being done, the saving of many lives. — Genesis 50:20 (NIV)",
      "memoryPrompt": "Joseph's test for his brothers was never about recognition — it was about whether Judah would sacrifice himself for Benjamin the way he once sacrificed Joseph.",
      "challengeFact": "Genesis 42:21 reveals for the first time that Joseph was pleading and crying out to his brothers from the pit when they sold him — this detail is entirely absent from the original account in Genesis 37, and only surfaces twenty years later when the guilt-stricken brothers confess it to each other in Egypt."
    },
    "questions": [
      {
        "id": "GEN-19-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 46:27, how many people in total went to Egypt as part of Jacob's family?",
        "options": ["Sixty people", "Seventy-five people", "Seventy people", "Eighty people"],
        "correctAnswer": 2,
        "verseReference": "Genesis 46:27"
      },
      {
        "id": "GEN-19-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 44:2, what item did Joseph instruct his steward to place in Benjamin's sack before the brothers left Egypt the second time?",
        "options": [
          "Joseph's own gold ring",
          "Joseph's silver cup",
          "A sealed letter of accusation",
          "The silver coins used to purchase their grain"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 44:2"
      },
      {
        "id": "GEN-19-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 45:10, in what region of Egypt did Joseph tell his family they would live so that they could be near him?",
        "options": [
          "The region of Memphis, near the capital",
          "The region of Goshen",
          "The region of Rameses in lower Egypt",
          "The region of the Nile delta near the sea"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 45:10"
      },
      {
        "id": "GEN-19-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHO",
        "question": "According to Genesis 44:18-34, which of Joseph's brothers stepped forward to offer himself as a slave in Benjamin's place?",
        "options": ["Reuben", "Levi", "Simeon", "Judah"],
        "correctAnswer": 3,
        "verseReference": "Genesis 44:18-34"
      },
      {
        "id": "GEN-19-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 45:8 (NIV), when Joseph explains his presence in Egypt to his brothers, what three roles does he say God has made him fill?",
        "options": [
          "Father to Pharaoh, lord of his entire household, and ruler of all Egypt",
          "Servant of Pharaoh, keeper of the granaries, and guardian of all the land",
          "Second to Pharaoh, administrator of the harvest, and ruler of the Nile lands",
          "Master of the household, father to the poor, and governor under Pharaoh"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 45:8"
      },
      {
        "id": "GEN-19-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 42:6-20, what is the correct sequence of events on the brothers' first visit to Joseph in Egypt?",
        "options": [
          "Brothers bowed → Joseph recognised them → accused them of being spies → they denied it → cited their family → Joseph put them in prison three days → released all but Simeon → demanded they bring Benjamin",
          "Brothers arrived → Joseph accused them immediately → put them in prison → released them after one day → kept Reuben → sent the rest to get Benjamin",
          "Brothers bowed → accused of spying → denied it → Joseph released them immediately → demanded they return with Benjamin → kept no hostage",
          "Joseph recognised them → they bowed → Joseph wept privately → accused them of spying → imprisoned them seven days → released all and sent them home"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 42:6-20"
      },
      {
        "id": "GEN-19-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 45:1-5 records Joseph's revelation of himself to his brothers. Which of the following is entirely absent from what Joseph says to his brothers in those five verses?",
        "options": [
          "That it was God who sent him to Egypt, not his brothers",
          "That there were still five years of famine remaining",
          "That his brothers should not be distressed or angry with themselves for selling him",
          "That he forgave each of his brothers individually by name"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 45:1-5"
      }
    ]
  },

"GEN-20-A": {
    "lessonId": "GEN-20-A",
    "lessonTitle": "Jacob's Blessing and Death",
    "passageRef": "Genesis 48:1-50:26",
    "studyCard": {
      "title": "The Crossed Hands and the Carried Bones",
      "hook": "Jacob deliberately crosses his hands to give the greater blessing to the younger son of Joseph — and when Joseph tries to correct him, Jacob refuses, saying he knows exactly what he is doing.",
      "teaching": "Genesis 48 opens with Jacob, old and ill, receiving Joseph and his two sons Manasseh and Ephraim. What follows is one of the most deliberate acts in all of Genesis: Jacob adopts Joseph's two sons as his own, elevating them to the status of his own sons alongside Reuben and Simeon. The legal declaration in verses 5-6 is precise: 'Ephraim and Manasseh will be mine, just as Reuben and Simeon are mine.' By adopting Joseph's two sons, Jacob gives Joseph a double portion of the inheritance — the portion that customarily belonged to the firstborn. This is the blessing of the firstborn being transferred to Joseph across the generation, since Reuben forfeited his firstborn status through the incident with Bilhah in Genesis 35:22.\n\nWhen Jacob moves to bless the boys, he deliberately crosses his hands — placing his right hand on Ephraim, the younger, and his left on Manasseh, the elder. Joseph sees this and tries to physically correct it, moving his father's hand from Ephraim to Manasseh. Jacob's response is firm and clear: 'I know, my son, I know.' He is not confused. He is not senile. He is operating with a prophetic clarity that reaches back to Genesis 25 when God declared 'the older will serve the younger.' The pattern of the younger receiving the greater blessing — Isaac over Ishmael, Jacob over Esau — continues with Ephraim over Manasseh. It will be confirmed historically: the tribe of Ephraim becomes the dominant tribe of the northern kingdom, so dominant that the northern kingdom is sometimes simply called 'Ephraim' in the prophetic books.\n\nJacob's deathbed blessings in Genesis 49 constitute one of the most important prophetic texts in the Pentateuch. Each blessing is a poetic oracle that doubles as a prophecy about the character and future of each tribe. Reuben is censured for instability; Simeon and Levi for their violent anger at Shechem. But the blessing of Judah in verses 8-12 is the one that reverberates through the entire rest of the Bible: 'The sceptre will not depart from Judah, nor the ruler's staff from between his feet, until he to whom it belongs shall come and the obedience of the nations shall be his.' The phrase 'until Shiloh comes' — or 'until he to whom it belongs comes' — is one of the earliest messianic prophecies in Scripture, pointing forward to a king from Judah's line whose rule will be universal. Every subsequent reader of the Old Testament who knew this verse was watching the tribe of Judah, waiting.\n\nJoseph's blessing in Genesis 49:22-26 is the longest of the twelve, filled with military and agricultural imagery. But it is the blessing of Judah that the narrative has been building toward. The book of Ruth will trace David's lineage back to Judah. The books of Samuel will establish the Davidic throne. Matthew 1:1 will open with 'the genealogy of Jesus the Messiah, the son of David, the son of Abraham' — and the first name in the chain between Abraham and Jesus is Judah.\n\nThe closing scene of Genesis is Joseph's request regarding his bones. 'I am about to die. But God will surely come to your aid and take you up out of this land he promised on oath to Abraham, Isaac and Jacob. And then you must carry my bones up from this place.' Joseph knows the Exodus is coming before it happens. He knows because of the promises made to Abraham in Genesis 15 — four hundred years of slavery, then deliverance. He does not ask to be buried in Egypt. He asks to be carried home when God acts. And in Exodus 13:19, Moses fulfils this request, carrying Joseph's bones out of Egypt during the Exodus — bones that had been waiting in Egypt for four hundred years for the promise to arrive.",
      "keyVerse": "The sceptre will not depart from Judah, nor the ruler's staff from between his feet, until he to whom it belongs shall come and the obedience of the nations shall be his. — Genesis 49:10 (NIV)",
      "memoryPrompt": "Genesis ends with Joseph's bones in Egypt, waiting — because he knew the Exodus was coming and he wanted to go home when God acted.",
      "challengeFact": "Joseph made the Israelites swear an oath to carry his bones out of Egypt before the book of Genesis ends — and those bones were carried for the entire forty years of wilderness wandering before being buried in Shechem, as recorded in Joshua 24:32, making Joseph's bones one of the longest-travelling relics in all of Scripture."
    },
    "questions": [
      {
        "id": "GEN-20-A-Q1",
        "difficultyLevel": "HARD",
        "questionType": "WHAT",
        "question": "According to Genesis 48:5, which two of Joseph's sons did Jacob formally adopt as his own, giving them the status of his own sons?",
        "options": [
          "Manasseh and Benjamin",
          "Ephraim and Manasseh",
          "Ephraim and the firstborn of Joseph's Egyptian wife",
          "Manasseh and the sons born after him"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 48:5"
      },
      {
        "id": "GEN-20-A-Q2",
        "difficultyLevel": "HARD",
        "questionType": "WHO",
        "question": "According to Genesis 49:8-10, over which of Jacob's sons was the prophecy of the sceptre and ruler's staff spoken?",
        "options": ["Reuben", "Joseph", "Judah", "Benjamin"],
        "correctAnswer": 2,
        "verseReference": "Genesis 49:10"
      },
      {
        "id": "GEN-20-A-Q3",
        "difficultyLevel": "VERY_HARD",
        "questionType": "EXACT_WORDING",
        "question": "In Genesis 48:19 (NIV), when Joseph tried to move Jacob's right hand from Ephraim to Manasseh, what did Jacob say to Joseph?",
        "options": [
          "The Lord has shown me what must be; do not resist the hand of God",
          "I know, my son, I know. He too will become a people, and he too will become great",
          "The younger shall be first; this is the Lord's doing, not mine",
          "Do not question what I do; God has told me which son will be greater"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 48:19"
      },
      {
        "id": "GEN-20-A-Q4",
        "difficultyLevel": "VERY_HARD",
        "questionType": "WHERE",
        "question": "According to Genesis 50:13, where did Joseph and his brothers bury their father Jacob after bringing his body from Egypt?",
        "options": [
          "In the burial ground of his ancestors near Harran",
          "In the cave of Machpelah in the field near Mamre in Canaan",
          "At Bethel, where Jacob had his dream of the stairway to heaven",
          "At Shechem, in the plot of ground Jacob had purchased"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 50:13"
      },
      {
        "id": "GEN-20-A-Q5",
        "difficultyLevel": "VERY_HARD",
        "questionType": "HOW_MANY",
        "question": "According to Genesis 50:3, how many days were spent embalming Jacob, and how many days did the Egyptians mourn for him?",
        "options": [
          "Thirty days embalming and forty days mourning",
          "Forty days embalming and seventy days mourning",
          "Seven days embalming and thirty days mourning",
          "Forty days embalming and forty days mourning"
        ],
        "correctAnswer": 1,
        "verseReference": "Genesis 50:3"
      },
      {
        "id": "GEN-20-A-Q6",
        "difficultyLevel": "EXPERT",
        "questionType": "SEQUENCE",
        "question": "In Genesis 48:13-19, what is the correct sequence of events in the blessing of Ephraim and Manasseh?",
        "options": [
          "Joseph placed Manasseh at Jacob's right and Ephraim at his left → Jacob crossed his hands putting right on Ephraim → Joseph tried to correct him → Jacob refused and explained",
          "Jacob crossed his hands immediately → Joseph placed the boys → Jacob blessed them → Joseph questioned → Jacob explained the younger would be greater",
          "Joseph placed Ephraim at the right → Jacob uncrossed his hands to correct it → blessed Manasseh first → then Ephraim",
          "Jacob asked which boy was which → Joseph identified them → Jacob crossed his hands → blessed them together without explaining"
        ],
        "correctAnswer": 0,
        "verseReference": "Genesis 48:13-19"
      },
      {
        "id": "GEN-20-A-Q7",
        "difficultyLevel": "EXPERT",
        "questionType": "ABSENCE",
        "question": "Genesis 50:24-25 records Joseph's final words and request before his death. Which of the following is entirely absent from what Joseph says in those two verses?",
        "options": [
          "That God would surely come to the aid of the Israelites",
          "That God would take them up out of Egypt to the land promised to Abraham, Isaac, and Jacob",
          "That they must carry his bones up from Egypt when God acts",
          "That the bones of Jacob and all the patriarchs must also be carried out together"
        ],
        "correctAnswer": 3,
        "verseReference": "Genesis 50:24-25"
      }
    ]
}
  };
