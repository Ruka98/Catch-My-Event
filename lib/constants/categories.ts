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