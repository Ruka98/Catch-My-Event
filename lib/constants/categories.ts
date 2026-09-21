export const categoryData = {
  "categories": [
    {
      "name": "Music",
      "subcategories": [
        "Live Music",
        "Concerts",
        "Festivals",
        "DJ Nights"
      ]
    },
    {
      "name": "Performing Arts",
      "subcategories": [
        "Theater",
        "Comedy",
        "Dance",
        "Circus"
      ]
    },
    {
      "name": "Visual Arts",
      "subcategories": [
        "Exhibitions",
        "Galleries",
        "Museums",
        "Street Art"
      ]
    },
    {
      "name": "Food & Drink",
      "subcategories": [
        "Food Festivals",
        "Tastings",
        "Dining Experiences",
        "Cooking Classes"
      ]
    },
    {
      "name": "Sports & Fitness",
      "subcategories": [
        "Live Sports",
        "Fitness Classes",
        "Outdoor Activities",
        "eSports"
      ]
    },
    {
      "name": "Nightlife",
      "subcategories": [
        "Clubs",
        "Bars",
        "Lounges",
        "Parties"
      ]
    },
    {
      "name": "Community",
      "subcategories": [
        "Networking",
        "Meetups",
        "Charity",
        "Spiritual"
      ]
    },
    {
      "name": "Education",
      "subcategories": [
        "Workshops",
        "Lectures",
        "Trainings",
        "Webinars"
      ]
    }
  ]
};

export const mainCategories = categoryData.categories.map(c => c.name);

export function getSubcategories(category: string): string[] {
  const data = categoryData.categories.find(c => c.name === category);
  return data ? data.subcategories : [];
}

export const categoryColors: { [key: string]: string } = {
  "Music": "#FF6347", // Tomato
  "Performing Arts": "#4682B4", // SteelBlue
  "Visual Arts": "#32CD32", // LimeGreen
  "Food & Drink": "#FFD700", // Gold
  "Sports & Fitness": "#00CED1", // DarkTurquoise
  "Nightlife": "#9400D3", // DarkViolet
  "Community": "#FF4500", // OrangeRed
  "Education": "#1E90FF" // DodgerBlue
};