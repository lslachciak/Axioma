/**
 * PVQ-RR (Portrait Values Questionnaire - Revised 57 Items) Data & Mappings
 * Shalom H. Schwartz (2012 / 2016)
 * Supports English ('en') and Polish ('pl')
 */

(function (exports) {
  'use strict';

  const SCALE_INSTRUCTIONS = {
    en: {
      title: "PVQ-RR Survey Instructions",
      description: "Here we describe brief portraits of different people. Please evaluate how much each person is or is not like you.",
      scale: [
        { value: 1, label: "1 - Not like me at all" },
        { value: 2, label: "2 - Not like me" },
        { value: 3, label: "3 - A little like me" },
        { value: 4, label: "4 - Moderately like me" },
        { value: 5, label: "5 - Like me" },
        { value: 6, label: "6 - Very much like me" }
      ]
    },
    pl: {
      title: "Instrukcja Kwestionariusza PVQ-RR",
      description: "Poniżej krótko zostaną scharakteryzowani niektórzy ludzie. Przeczytaj każdy opis i zastanów się, na ile przedstawiony człowiek jest lub nie jest podobny do Ciebie. Następnie zaznacz „X” w okienku, które określa stopień podobieństwa między opisanym człowiekiem a Tobą.",
      scale: [
        { value: 1, label: "1 - zupełnie niepodobny do mnie" },
        { value: 2, label: "2 - niepodobny do mnie" },
        { value: 3, label: "3 - trochę podobny do mnie" },
        { value: 4, label: "4 - średnio podobny do mnie" },
        { value: 5, label: "5 - podobny do mnie" },
        { value: 6, label: "6 - bardzo podobny do mnie" }
      ]
    }
  };

  const ITEMS = [
    {
      id: 1,
      valueKey: "SDT",
      en: "It is important to them to form their views independently.",
      pl: "Jest dla niego ważne, aby być niezależnym w kształtowaniu swoich poglądów."
    },
    {
      id: 2,
      valueKey: "SES",
      en: "It is important to them that their country is secure and stable.",
      pl: "Jest dla niego ważne, aby jego kraj był bezpieczny i stabilny."
    },
    {
      id: 3,
      valueKey: "HED",
      en: "It is important to them to have a good time.",
      pl: "Jest dla niego ważne, aby przyjemnie spędzać czas."
    },
    {
      id: 4,
      valueKey: "COI",
      en: "It is important to them to avoid upsetting other people.",
      pl: "Jest dla niego ważne, aby unikać irytowania innych."
    },
    {
      id: 5,
      valueKey: "UNC",
      en: "It is important to them that the weak and vulnerable in society be protected.",
      pl: "Jest dla niego ważne, aby słabi i bezbronni ludzie w społeczeństwie byli chronieni."
    },
    {
      id: 6,
      valueKey: "POD",
      en: "It is important to them to be the one who tells others what to do.",
      pl: "Jest dla niego ważne, aby ludzie robili wszystko, cokolwiek im nakaże."
    },
    {
      id: 7,
      valueKey: "HUM",
      en: "It is important to them never to think they are more important than others.",
      pl: "Jest dla niego ważne, aby nigdy nie myśleć, że zasługuje na coś więcej niż inni ludzie."
    },
    {
      id: 8,
      valueKey: "UNN",
      en: "It is important to them to care for nature and the environment.",
      pl: "Jest dla niego ważne, aby troszczyć się o przyrodę."
    },
    {
      id: 9,
      valueKey: "FAC",
      en: "It is important to them that no one ever embarrasses them or makes them feel ashamed.",
      pl: "Jest dla niego ważne, aby nikt go nigdy nie upokorzył."
    },
    {
      id: 10,
      valueKey: "STI",
      en: "It is important to them to seek excitement and take risks.",
      pl: "Jest dla niego ważne, aby ciągle robić coś innego."
    },
    {
      id: 11,
      valueKey: "BEC",
      en: "It is important to them to care for the well-being of people they are close to.",
      pl: "Jest dla niego ważne, aby troszczyć się o bliskie mu osoby."
    },
    {
      id: 12,
      valueKey: "POR",
      en: "It is important to them to be wealthy and own expensive things.",
      pl: "Jest dla niego ważna siła, którą mogą dać pieniądze."
    },
    {
      id: 13,
      valueKey: "SEP",
      en: "It is important to them to protect themselves against any threats to their personal safety.",
      pl: "Jest dla niego bardzo ważne, aby unikać chorób i chronić swoje zdrowie."
    },
    {
      id: 14,
      valueKey: "UNT",
      en: "It is important to them to accept people even when they disagree with them.",
      pl: "Jest dla niego ważne, aby być tolerancyjnym w stosunku do wszystkich rodzajów ludzi i grup."
    },
    {
      id: 15,
      valueKey: "COR",
      en: "It is important to them to follow all rules even when no one is watching.",
      pl: "Jest dla niego ważne, aby nigdy nie naruszać reguł lub regulaminu."
    },
    {
      id: 16,
      valueKey: "SDA",
      en: "It is important to them to make their own decisions about their life.",
      pl: "Jest dla niego ważne, aby samemu podejmować decyzje dotyczące swojego życia."
    },
    {
      id: 17,
      valueKey: "ACH",
      en: "It is important to them to show their abilities and be admired for their success.",
      pl: "Jest dla niego ważne, aby wiele w życiu zdobyć."
    },
    {
      id: 18,
      valueKey: "TRD",
      en: "It is important to them to maintain traditional values and customs.",
      pl: "Jest dla niego ważne, aby podtrzymywać tradycyjne wartości i sposoby myślenia."
    },
    {
      id: 19,
      valueKey: "BED",
      en: "It is important to them that people they know can rely on them completely.",
      pl: "Jest dla niego ważne, aby ludzie, których zna, mieli do niego pełne zaufanie."
    },
    {
      id: 20,
      valueKey: "POR",
      en: "It is important to them to have control over financial resources and money.",
      pl: "Jest dla niego ważne, aby być bogatym."
    },
    {
      id: 21,
      valueKey: "UNN",
      en: "It is important to them to protect animals and preserve plant life.",
      pl: "Jest dla niego ważne, aby brać udział w działaniach na rzecz ochrony przyrody."
    },
    {
      id: 22,
      valueKey: "COI",
      en: "It is important to them never to irritate or offend other people.",
      pl: "Jest dla niego ważne, aby nigdy nikogo nie denerwować."
    },
    {
      id: 23,
      valueKey: "SDT",
      en: "It is important to them to figure out things by themselves.",
      pl: "Jest dla niego ważne, aby samemu kształtować swoje opinie na różne tematy."
    },
    {
      id: 24,
      valueKey: "FAC",
      en: "It is important to them to protect their public image and reputation.",
      pl: "Jest dla niego ważna ochrona jego publicznego wizerunku."
    },
    {
      id: 25,
      valueKey: "BEC",
      en: "It is important to them to help the people close to them whenever they need it.",
      pl: "Jest dla niego bardzo ważne, by pomagać drogim mu osobom."
    },
    {
      id: 26,
      valueKey: "SEP",
      en: "It is important to them to live in secure surroundings.",
      pl: "Jest dla niego ważne osobiste bezpieczeństwo i brak zagrożeń."
    },
    {
      id: 27,
      valueKey: "BED",
      en: "It is important to them to be trustworthy and reliable in all relationships.",
      pl: "Jest dla niego ważne, aby być niezawodnym i godnym zaufania przyjacielem."
    },
    {
      id: 28,
      valueKey: "STI",
      en: "It is important to them to do novel and exciting things.",
      pl: "Jest dla niego ważne, aby podejmować ryzyko, które sprawia, że życie jest bardziej ekscytujące."
    },
    {
      id: 29,
      valueKey: "POD",
      en: "It is important to them to hold power and exercise control over others.",
      pl: "Jest dla niego ważne, aby mieć władzę, która sprawia, że ludzie robią to, co on chce."
    },
    {
      id: 30,
      valueKey: "SDA",
      en: "It is important to them to choose their own goals and direct their own activities.",
      pl: "Jest dla niego ważne, aby być niezależnym w planowaniu swoich działań."
    },
    {
      id: 31,
      valueKey: "COR",
      en: "It is important to them to obey laws and formal regulations strictly.",
      pl: "Jest dla niego ważne, aby postępować zgodnie z regułami nawet wtedy, gdy nikt tego nie widzi."
    },
    {
      id: 32,
      valueKey: "ACH",
      en: "It is important to them to achieve ambitious goals and succeed.",
      pl: "Jest dla niego ważne, aby odnieść dużo sukcesów."
    },
    {
      id: 33,
      valueKey: "TRD",
      en: "It is important to them to honor the religious and cultural traditions of their group.",
      pl: "Jest dla niego ważne, aby przestrzegać obyczajów swojej rodziny lub obyczajów religii."
    },
    {
      id: 34,
      valueKey: "UNT",
      en: "It is important to them to listen to people who are different from them with open-mindedness.",
      pl: "Jest dla niego ważne, aby słuchać i rozumieć ludzi, którzy się od niego różnią."
    },
    {
      id: 35,
      valueKey: "SES",
      en: "It is important to them that order and stability in society are preserved.",
      pl: "Jest dla niego ważne, aby państwo było silne i mogło bronić swoich obywateli."
    },
    {
      id: 36,
      valueKey: "HED",
      en: "It is important to them to indulge themselves and enjoy life's pleasures.",
      pl: "Jest dla niego ważne, aby czerpać z życia przyjemności."
    },
    {
      id: 37,
      valueKey: "UNC",
      en: "It is important to them that social justice is promoted and every person is treated fairly.",
      pl: "Jest dla niego ważne, aby każdy człowiek na świecie miał równe szanse w życiu."
    },
    {
      id: 38,
      valueKey: "HUM",
      en: "It is important to them to remain humble and modest in all circumstances.",
      pl: "Jest dla niego ważne, aby być skromnym człowiekiem."
    },
    {
      id: 39,
      valueKey: "SDT",
      en: "It is important to them to explore new ideas and think independently.",
      pl: "Jest dla niego ważne, aby po swojemu zrozumieć różne rzeczy."
    },
    {
      id: 40,
      valueKey: "TRD",
      en: "It is important to them to preserve traditional customs handed down by ancestors.",
      pl: "Jest dla niego ważne, aby szanować tradycyjne zwyczaje swojej kultury."
    },
    {
      id: 41,
      valueKey: "POD",
      en: "It is important to them to command respect and lead others.",
      pl: "Jest dla niego ważne, aby być tym, kto mówi innym, co mają robić."
    },
    {
      id: 42,
      valueKey: "COR",
      en: "It is important to them to avoid doing anything that violates society's rules.",
      pl: "Jest dla niego ważne, aby przestrzegać wszystkich przepisów prawnych."
    },
    {
      id: 43,
      valueKey: "STI",
      en: "It is important to them to seek out adventures and intense experiences.",
      pl: "Jest dla niego ważne, aby doświadczać wszelkich nowych przeżyć."
    },
    {
      id: 44,
      valueKey: "POR",
      en: "It is important to them to accumulate wealth and possess material resources.",
      pl: "Jest dla niego ważne, aby posiadać drogie rzeczy, które świadczą o jego bogactwie."
    },
    {
      id: 45,
      valueKey: "UNN",
      en: "It is important to them to prevent pollution and protect the natural environment.",
      pl: "Jest dla niego ważne, aby chronić środowisko naturalne przed zniszczeniem lub zanieczyszczeniem."
    },
    {
      id: 46,
      valueKey: "HED",
      en: "It is important to them to seek fun, enjoyment, and personal satisfaction.",
      pl: "Jest dla niego ważne, aby dobrze się bawić w każdej sytuacji."
    },
    {
      id: 47,
      valueKey: "BEC",
      en: "It is important to them to devote themselves to helping people close to them.",
      pl: "Jest dla niego ważne, aby zajmować się każdą potrzebą drogich mu osób."
    },
    {
      id: 48,
      valueKey: "ACH",
      en: "It is important to them to perform at a high level and demonstrate competence.",
      pl: "Jest dla niego ważne, aby ludzie docenili jego osiągnięcia."
    },
    {
      id: 49,
      valueKey: "FAC",
      en: "It is important to them to protect their dignity and maintain their social standing.",
      pl: "Jest dla niego ważne, aby nigdy nie zostać poniżonym."
    },
    {
      id: 50,
      valueKey: "SES",
      en: "It is important to them that state and national security is preserved at all times.",
      pl: "Jest dla niego ważne, aby jego kraj mógł obronić się przed wszystkimi zagrożeniami."
    },
    {
      id: 51,
      valueKey: "COI",
      en: "It is important to them to avoid causing conflict or upsetting people around them.",
      pl: "Jest dla niego ważne, aby nigdy nikogo nie rozgniewać."
    },
    {
      id: 52,
      valueKey: "UNC",
      en: "It is important to them to defend equality and advocate for vulnerable groups.",
      pl: "Jest dla niego ważne, aby wszyscy byli traktowani sprawiedliwie, nawet ci, których nie zna."
    },
    {
      id: 53,
      valueKey: "SEP",
      en: "It is important to them to stay safe and protect themselves from bodily harm.",
      pl: "Jest dla niego ważne, aby unikać wszystkiego, co jest niebezpieczne."
    },
    {
      id: 54,
      valueKey: "HUM",
      en: "It is important to them to avoid boasting and remain modest about achievements.",
      pl: "Jest dla niego ważne, aby być zadowolonym z tego, co posiada, i nie chcieć niczego więcej."
    },
    {
      id: 55,
      valueKey: "BED",
      en: "It is important to them to stand by friends and family through thick and thin.",
      pl: "Jest dla niego ważne, aby wszyscy jego przyjaciele i rodzina mogli na nim całkowicie polegać."
    },
    {
      id: 56,
      valueKey: "SDA",
      en: "It is important to them to act autonomously and be freedom-oriented in life.",
      pl: "Jest dla niego ważne, aby być wolnym w wyborze tego, co robi."
    },
    {
      id: 57,
      valueKey: "UNT",
      en: "It is important to them to accept people even when their beliefs disagree with theirs.",
      pl: "Jest dla niego ważne, aby akceptować ludzi nawet wtedy, gdy się z nimi nie zgadza."
    }
  ];

  const REFINED_VALUES = {
    SDT: { code: "SDT", nameEn: "Self-Direction - Thought", namePl: "Samosterowność - Myślenie", items: [1, 23, 39], higherOrder: "Openness" },
    SDA: { code: "SDA", nameEn: "Self-Direction - Action", namePl: "Samosterowność - Działanie", items: [16, 30, 56], higherOrder: "Openness" },
    STI: { code: "STI", nameEn: "Stimulation", namePl: "Stymulacja", items: [10, 28, 43], higherOrder: "Openness" },
    HED: { code: "HED", nameEn: "Hedonism", namePl: "Hedonizm", items: [3, 36, 46], higherOrder: "Openness" },
    ACH: { code: "ACH", nameEn: "Achievement", namePl: "Osiągnięcia", items: [17, 32, 48], higherOrder: "Enhancement" },
    POD: { code: "POD", nameEn: "Power - Dominance", namePl: "Władza - Dominacja", items: [6, 29, 41], higherOrder: "Enhancement" },
    POR: { code: "POR", nameEn: "Power - Resources", namePl: "Władza - Zasoby", items: [12, 20, 44], higherOrder: "Enhancement" },
    FAC: { code: "FAC", nameEn: "Face", namePl: "Wizerunek / Twarz", items: [9, 24, 49], higherOrder: "Conservation" },
    SEP: { code: "SEP", nameEn: "Security - Personal", namePl: "Bezpieczeństwo - Osobiste", items: [13, 26, 53], higherOrder: "Conservation" },
    SES: { code: "SES", nameEn: "Security - Societal", namePl: "Bezpieczeństwo - Społeczne", items: [2, 35, 50], higherOrder: "Conservation" },
    TRD: { code: "TRD", nameEn: "Tradition", namePl: "Tradycja", items: [18, 33, 40], higherOrder: "Conservation" },
    COR: { code: "COR", nameEn: "Conformity - Rules", namePl: "Konieczność / Konformizm - Reguły", items: [15, 31, 42], higherOrder: "Conservation" },
    COI: { code: "COI", nameEn: "Conformity - Interpersonal", namePl: "Konformizm - Interpersonalny", items: [4, 22, 51], higherOrder: "Conservation" },
    HUM: { code: "HUM", nameEn: "Humility", namePl: "Pokora", items: [7, 38, 54], higherOrder: "Conservation" },
    UNN: { code: "UNN", nameEn: "Universalism - Nature", namePl: "Uniwersalizm - Natura", items: [8, 21, 45], higherOrder: "Transcendence" },
    UNC: { code: "UNC", nameEn: "Universalism - Concern", namePl: "Uniwersalizm - Troska", items: [5, 37, 52], higherOrder: "Transcendence" },
    UNT: { code: "UNT", nameEn: "Universalism - Tolerance", namePl: "Uniwersalizm - Tolerancja", items: [14, 34, 57], higherOrder: "Transcendence" },
    BEC: { code: "BEC", nameEn: "Benevolence - Care", namePl: "Opiekuńczość - Troska", items: [11, 25, 47], higherOrder: "Transcendence" },
    BED: { code: "BED", nameEn: "Benevolence - Dependability", namePl: "Opiekuńczość - Niezawodność", items: [19, 27, 55], higherOrder: "Transcendence" }
  };

  const HIGHER_ORDER_VALUES = {
    Openness: {
      code: "Openness",
      nameEn: "Openness to Change",
      namePl: "Otwartość na zmiany",
      refinedKeys: ["SDT", "SDA", "STI", "HED"]
    },
    Enhancement: {
      code: "Enhancement",
      nameEn: "Self-Enhancement",
      namePl: "Umacnianie siebie",
      refinedKeys: ["ACH", "POD", "POR"]
    },
    Conservation: {
      code: "Conservation",
      nameEn: "Conservation",
      namePl: "Zachowawczość / Konserwatyzm",
      refinedKeys: ["FAC", "SEP", "SES", "TRD", "COR", "COI", "HUM"]
    },
    Transcendence: {
      code: "Transcendence",
      nameEn: "Self-Transcendence",
      namePl: "Przekraczanie siebie",
      refinedKeys: ["UNN", "UNC", "UNT", "BEC", "BED"]
    }
  };

  exports.SCALE_INSTRUCTIONS = SCALE_INSTRUCTIONS;
  exports.ITEMS = ITEMS;
  exports.REFINED_VALUES = REFINED_VALUES;
  exports.HIGHER_ORDER_VALUES = HIGHER_ORDER_VALUES;

})(typeof exports !== 'undefined' ? exports : (window.PVQData = {}));
