// Story + metadata for every night. Edit the text here - the scenes read from this file.
// Festival facts to double-check are listed in docs/CONTENT_TO_VERIFY.md.

export const IMPLEMENTED = 5; // nights that are playable in this build

export const PROLOGUE = {
  bg: 'title_bg',
  art: 'keeper',
  title: 'Tihar: the festival of lights',
  body:
    'For five days every autumn, Nepal says thank you: to the crow, the dog, the cow, to the hill and the self, and to our brothers and sisters.\n\n' +
    'Light a diya, and the dark steps back. Each night one more wick joins the flame. Carry it through all five.',
  next: 'Night1',
  wicksBefore: 0,
};

export const NIGHTS = {
  1: {
    id: 1,
    scene: 'Night1',
    day: 'Day 1',
    name: 'Kaag Tihar',
    who: 'the Crow',
    goal: 'Light the offerings. Feed five crows before dusk fades.',
    bg: 'bg_n1',
    card: {
      art: 'crow_perched',
      title: 'Kaag Tihar: the Crow',
      body:
        'On the first day of Tihar, families set out grain and sweets on rooftops and by the door for the crows.\n\n' +
        'The crow is seen as a messenger. Its call can carry news, even sad news. Feeding it first is a wish that only gentle news arrives.',
      fact: 'Festival fact · Day 1 · Kaag Tihar',
    },
    next: 'Night2',
  },
  2: {
    id: 2,
    scene: 'Night2',
    day: 'Day 2',
    name: 'Kukur Tihar',
    who: 'the Dog',
    goal: 'Guard the gate. Jump the pots, gather the marigolds.',
    bg: 'bg_n2',
    card: {
      art: 'dog_tika',
      title: 'Kukur Tihar: the Dog',
      body:
        'On the second day, dogs are honoured for their loyalty. They receive a marigold garland, a red tika on the forehead and a proper feast.\n\n' +
        'In the tradition, dogs are also said to guard the gate of Yama, the lord of death. Tonight the guardian gets thanked.',
      fact: 'Festival fact · Day 2 · Kukur Tihar',
    },
    next: 'Night3',
  },
  3: {
    id: 3,
    scene: 'Night3',
    day: 'Day 3',
    name: 'Laxmi Puja',
    who: 'the Cow and the Light',
    goal: 'Keep every house-light burning until midnight. A garlanded cow brings a blessing.',
    bg: 'bg_n3',
    card: {
      art: 'cow',
      title: 'Gai Tihar & Laxmi Puja',
      body:
        'On the third morning the cow is honoured: garlanded, fed and thanked for the milk and the work she gives.\n\n' +
        'In the evening homes are cleaned and filled with lights. Laxmi, the goddess of wealth, is said to visit the houses that are bright.',
      fact: 'Festival fact · Day 3 · Laxmi Puja',
    },
    next: 'Night4',
  },
  4: {
    id: 4,
    scene: 'Night4',
    day: 'Day 4',
    name: 'Govardhan Puja',
    who: 'the Hill of Offerings',
    goal: 'Stack the annakut, offering by offering, and crown it with the maha-deep.',
    bg: 'bg_n4',
    card: {
      art: 'card_hill',
      title: 'Govardhan Puja: the Hill of Food',
      body:
        'On the fourth day families build a small hill of cow dung and offerings, the annakut or mountain of food, and crown it with a lit lamp.\n\n' +
        'Walking around it in circles, they retell the story of Krishna lifting Govardhan hill to shelter the village from Indra\'s storm.',
      fact: 'Festival fact · Day 4 · Govardhan Puja',
    },
    next: 'Night5',
  },
  5: {
    id: 5,
    scene: 'Night5',
    day: 'Day 5',
    name: 'Bhai Tika',
    who: 'Sister and Brother',
    goal: 'Repeat the colours Yamuna shows you, and finish the tika before Yama arrives.',
    bg: 'bg_n5',
    card: {
      art: 'yamuna',
      title: 'Bhai Tika: Sister and Brother',
      body:
        'On the last day sisters apply a tika of seven colours on their brothers\' foreheads and pray for their long lives, with sweets, fruit and a garland.\n\n' +
        'The story says Yamuna did this for her brother Yama, lord of death. Pleased, he promised that brothers who receive a tika today need not fear him.',
      fact: 'Festival fact · Day 5 · Bhai Tika',
    },
    next: 'Ending',
  },
};

// How many of the five music layers play in each scene (0 = prologue). One more voice joins as each wick is lit.
export const NIGHT_LEVEL = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 4, 5: 5 };
