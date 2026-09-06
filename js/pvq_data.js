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
      description: "Poniżej znajdują się krótkie opisy różnych osób. Oceń, na ile każda z tych osób jest lub nie jest do Ciebie podobna.",
      scale: [
        { value: 1, label: "1 - Zupełnie niepodobna/y do mnie" },
        { value: 2, label: "2 - Niepodobna/y do mnie" },
        { value: 3, label: "3 - Trochę podobna/y do mnie" },
        { value: 4, label: "4 - Średnio podobna/y do mnie" },
        { value: 5, label: "5 - Podobna/y do mnie" },
        { value: 6, label: "6 - Bardzo podobna/y do mnie" }
      ]
    }
  };

  const ITEMS = [
    {
      id: 1,
      valueKey: "SDT",
      en: "It is important to them to form their views independently.",
      pl: "Ważne jest dla tej osoby, aby samodzielnie kształtować własne poglądy."
    },
    {
      id: 2,
      valueKey: "SES",
      en: "It is important to them that their country is secure and stable.",
      pl: "Ważne jest dla tej osoby, aby jej kraj był bezpieczny i stabilny."
    },
    {
      id: 3,
      valueKey: "HED",
      en: "It is important to them to have a good time.",
      pl: "Ważne jest dla tej osoby, aby dobrze się bawić i czerpać przyjemność z życia."
    },
    {
      id: 4,
      valueKey: "COI",
      en: "It is important to them to avoid upsetting other people.",
      pl: "Ważne jest dla tej osoby, aby unikać sprawiania przykrości innym ludziom."
    },
    {
      id: 5,
      valueKey: "UNC",
      en: "It is important to them that the weak and vulnerable in society be protected.",
      pl: "Ważne jest dla tej osoby, aby chronić osoby słabe i wrażliwe w społeczeństwie."
    },
    {
      id: 6,
      valueKey: "POD",
      en: "It is important to them to be the one who tells others what to do.",
      pl: "Ważne jest dla tej osoby, aby kierować innymi i mówić im, co mają robić."
    },
    {
      id: 7,
      valueKey: "HUM",
      en: "It is important to them never to think they are more important than others.",
      pl: "Ważne jest dla tej osoby, aby nigdy nie uważać się za ważniejszą/ego od innych."
    },
    {
      id: 8,
      valueKey: "UNN",
      en: "It is important to them to care for nature and the environment.",
      pl: "Ważne jest dla tej osoby, aby dbać o przyrodę i środowisko naturalne."
    },
    {
      id: 9,
      valueKey: "FAC",
      en: "It is important to them that no one ever embarrasses them or makes them feel ashamed.",
      pl: "Ważne jest dla tej osoby, aby nikt jej nie zawstydzał ani nie wprawiał w zakłopotanie."
    },
    {
      id: 10,
      valueKey: "STI",
      en: "It is important to them to seek excitement and take risks.",
      pl: "Ważne jest dla tej osoby, aby szukać emocji i podejmować ryzyko."
    },
    {
      id: 11,
      valueKey: "BEC",
      en: "It is important to them to care for the well-being of people they are close to.",
      pl: "Ważne jest dla tej osoby, aby dbać o dobrobyt i pomyślność bliskich osób."
    },
    {
      id: 12,
      valueKey: "POR",
      en: "It is important to them to be wealthy and own expensive things.",
      pl: "Ważne jest dla tej osoby, aby być zamożną/ym i posiadać kosztowne rzeczy."
    },
    {
      id: 13,
      valueKey: "SEP",
      en: "It is important to them to protect themselves against any threats to their personal safety.",
      pl: "Ważne jest dla tej osoby, aby chronić się przed wszelkimi zagrożeniami osobistego bezpieczeństwa."
    },
    {
      id: 14,
      valueKey: "UNT",
      en: "It is important to them to accept people even when they disagree with them.",
      pl: "Ważne jest dla tej osoby, aby akceptować ludzi nawet wtedy, gdy się z nimi nie zgadza."
    },
    {
      id: 15,
      valueKey: "COR",
      en: "It is important to them to follow all rules even when no one is watching.",
      pl: "Ważne jest dla tej osoby, aby przestrzegać wszelkich reguł, nawet gdy nikt nie patrzy."
    },
    {
      id: 16,
      valueKey: "SDA",
      en: "It is important to them to make their own decisions about their life.",
      pl: "Ważne jest dla tej osoby, aby samodzielnie podejmować decyzje dotyczące własnego życia."
    },
    {
      id: 17,
      valueKey: "ACH",
      en: "It is important to them to show their abilities and be admired for their success.",
      pl: "Ważne jest dla tej osoby, aby pokazywać swoje umiejętności i być podziwianą/ym za sukcesy."
    },
    {
      id: 18,
      valueKey: "TRD",
      en: "It is important to them to maintain traditional values and customs.",
      pl: "Ważne jest dla tej osoby, aby podtrzymywać tradycyjne wartości i zwyczaje."
    },
    {
      id: 19,
      valueKey: "BED",
      en: "It is important to them that people they know can rely on them completely.",
      pl: "Ważne jest dla tej osoby, aby znajomi mogli na niej całkowicie polegać."
    },
    {
      id: 20,
      valueKey: "POR",
      en: "It is important to them to have control over financial resources and money.",
      pl: "Ważne jest dla tej osoby, aby mieć kontrolę nad zasobami finansowymi i pieniędzmi."
    },
    {
      id: 21,
      valueKey: "UNN",
      en: "It is important to them to protect animals and preserve plant life.",
      pl: "Ważne jest dla tej osoby, aby chronić zwierzęta i dbać o roślinność."
    },
    {
      id: 22,
      valueKey: "COI",
      en: "It is important to them never to irritate or offend other people.",
      pl: "Ważne jest dla tej osoby, aby nigdy nie irytować ani nie obrażać innych ludzi."
    },
    {
      id: 23,
      valueKey: "SDT",
      en: "It is important to them to figure out things by themselves.",
      pl: "Ważne jest dla tej osoby, aby samodzielnie dochodzić do wszystkiego i rozumieć rzeczy po swojemu."
    },
    {
      id: 24,
      valueKey: "FAC",
      en: "It is important to them to protect their public image and reputation.",
      pl: "Ważne jest dla tej osoby, aby chronić swój wizerunek publiczny i reputację."
    },
    {
      id: 25,
      valueKey: "BEC",
      en: "It is important to them to help the people close to them whenever they need it.",
      pl: "Ważne jest dla tej osoby, aby pomagać bliskim za każdym razem, gdy tego potrzebują."
    },
    {
      id: 26,
      valueKey: "SEP",
      en: "It is important to them to live in secure surroundings.",
      pl: "Ważne jest dla tej osoby, aby żyć w bezpiecznym otoczeniu."
    },
    {
      id: 27,
      valueKey: "BED",
      en: "It is important to them to be trustworthy and reliable in all relationships.",
      pl: "Ważne jest dla tej osoby, aby być godną/ym zaufania i niezawodną/ym w relacjach."
    },
    {
      id: 28,
      valueKey: "STI",
      en: "It is important to them to do novel and exciting things.",
      pl: "Ważne jest dla tej osoby, aby robić nowe i ekscytujące rzeczy."
    },
    {
      id: 29,
      valueKey: "POD",
      en: "It is important to them to hold power and exercise control over others.",
      pl: "Ważne jest dla tej osoby, aby posiadać władzę i sprawować kontrolę nad innymi."
    },
    {
      id: 30,
      valueKey: "SDA",
      en: "It is important to them to choose their own goals and direct their own activities.",
      pl: "Ważne jest dla tej osoby, aby wyznaczać własne cele i kierować własnymi działaniami."
    },
    {
      id: 31,
      valueKey: "COR",
      en: "It is important to them to obey laws and formal regulations strictly.",
      pl: "Ważne jest dla tej osoby, aby ściśle przestrzegać prawa i formalnych przepisów."
    },
    {
      id: 32,
      valueKey: "ACH",
      en: "It is important to them to achieve ambitious goals and succeed.",
      pl: "Ważne jest dla tej osoby, aby osiągać ambitne cele i odnosić sukcesy."
    },
    {
      id: 33,
      valueKey: "TRD",
      en: "It is important to them to honor the religious and cultural traditions of their group.",
      pl: "Ważne jest dla tej osoby, aby szanować tradycje religijne i kulturowe swojej grupy."
    },
    {
      id: 34,
      valueKey: "UNT",
      en: "It is important to them to listen to people who are different from them with open-mindedness.",
      pl: "Ważne jest dla tej osoby, aby z otwartym umysłem słuchać ludzi różniących się od niej."
    },
    {
      id: 35,
      valueKey: "SES",
      en: "It is important to them that order and stability in society are preserved.",
      pl: "Ważne jest dla tej osoby, aby zachowany był porządek i stabilność w społeczeństwie."
    },
    {
      id: 36,
      valueKey: "HED",
      en: "It is important to them to indulge themselves and enjoy life's pleasures.",
      pl: "Ważne jest dla tej osoby, aby dogadzać sobie i czerpać przyjemność z życiowych uciech."
    },
    {
      id: 37,
      valueKey: "UNC",
      en: "It is important to them that social justice is promoted and every person is treated fairly.",
      pl: "Ważne jest dla tej osoby, aby promować sprawiedliwość społeczną i traktować każdego równo."
    },
    {
      id: 38,
      valueKey: "HUM",
      en: "It is important to them to remain humble and modest in all circumstances.",
      pl: "Ważne jest dla tej osoby, aby zachować skromność i pokorę w każdych okolicznościach."
    },
    {
      id: 39,
      valueKey: "SDT",
      en: "It is important to them to explore new ideas and think independently.",
      pl: "Ważne jest dla tej osoby, aby poznawać nowe pomysły i myśleć niezależnie."
    },
    {
      id: 40,
      valueKey: "TRD",
      en: "It is important to them to preserve traditional customs handed down by ancestors.",
      pl: "Ważne jest dla tej osoby, aby pielęgnować tradycyjne zwyczaje przekazane przez przodków."
    },
    {
      id: 41,
      valueKey: "POD",
      en: "It is important to them to command respect and lead others.",
      pl: "Ważne jest dla tej osoby, aby budzić szacunek i przewodzić innym."
    },
    {
      id: 42,
      valueKey: "COR",
      en: "It is important to them to avoid doing anything that violates society's rules.",
      pl: "Ważne jest dla tej osoby, aby unikać wszystkiego, co narusza zasady społeczne."
    },
    {
      id: 43,
      valueKey: "STI",
      en: "It is important to them to seek out adventures and intense experiences.",
      pl: "Ważne jest dla tej osoby, aby szukać przygód i mocnych wrażeń."
    },
    {
      id: 44,
      valueKey: "POR",
      en: "It is important to them to accumulate wealth and possess material resources.",
      pl: "Ważne jest dla tej osoby, aby gromadzić majątek i posiadać zasoby materialne."
    },
    {
      id: 45,
      valueKey: "UNN",
      en: "It is important to them to prevent pollution and protect the natural environment.",
      pl: "Ważne jest dla tej osoby, aby zapobiegać zanieczyszczeniom i chronić środowisko naturalne."
    },
    {
      id: 46,
      valueKey: "HED",
      en: "It is important to them to seek fun, enjoyment, and personal satisfaction.",
      pl: "Ważne jest dla tej osoby, aby dążyć do zabawy, przyjemności i osobistej satysfakcji."
    },
    {
      id: 47,
      valueKey: "BEC",
      en: "It is important to them to devote themselves to helping people close to them.",
      pl: "Ważne jest dla tej osoby, aby poświęcać się pomocy najbliższym."
    },
    {
      id: 48,
      valueKey: "ACH",
      en: "It is important to them to perform at a high level and demonstrate competence.",
      pl: "Ważne jest dla tej osoby, aby osiągać wysokie wyniki i wykazywać się kompetencjami."
    },
    {
      id: 49,
      valueKey: "FAC",
      en: "It is important to them to protect their dignity and maintain their social standing.",
      pl: "Ważne jest dla tej osoby, aby chronić swoją godność i utrzymać pozycję społeczną."
    },
    {
      id: 50,
      valueKey: "SES",
      en: "It is important to them that state and national security is preserved at all times.",
      pl: "Ważne jest dla tej osoby, aby bezpieczeństwo państwa i narodu było zawsze chronione."
    },
    {
      id: 51,
      valueKey: "COI",
      en: "It is important to them to avoid causing conflict or upsetting people around them.",
      pl: "Ważne jest dla tej osoby, aby unikać wywoływania konfliktów i sprawiania przykrości ludziom wokół."
    },
    {
      id: 52,
      valueKey: "UNC",
      en: "It is important to them to defend equality and advocate for vulnerable groups.",
      pl: "Ważne jest dla tej osoby, aby bronić równości i występować w obronie grup słabszych."
    },
    {
      id: 53,
      valueKey: "SEP",
      en: "It is important to them to stay safe and protect themselves from bodily harm.",
      pl: "Ważne jest dla tej osoby, aby dbać o własne bezpieczeństwo i chronić się przed krzywdą fizyczną."
    },
    {
      id: 54,
      valueKey: "HUM",
      en: "It is important to them to avoid boasting and remain modest about achievements.",
      pl: "Ważne jest dla tej osoby, aby unikać chwalenia się i zachowywać skromność wobec osiągnięć."
    },
    {
      id: 55,
      valueKey: "BED",
      en: "It is important to them to stand by friends and family through thick and thin.",
      pl: "Ważne jest dla tej osoby, aby trwać przy rodzinie i przyjaciołach na dobre i na złe."
    },
    {
      id: 56,
      valueKey: "SDA",
      en: "It is important to them to act autonomously and be freedom-oriented in life.",
      pl: "Ważne jest dla tej osoby, aby postępować autonomicznie i cenić wolność w życiu."
    },
    {
      id: 57,
      valueKey: "UNT",
      en: "It is important to them to accept people even when their beliefs disagree with theirs.",
      pl: "Ważne jest dla tej osoby, aby akceptować ludzi nawet wtedy, gdy ich przekonania różnią się od jej własnych."
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
