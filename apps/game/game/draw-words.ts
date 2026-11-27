// Draw it words: everyday things that are fun to draw, by how hard they are.
// From Google's Quick, Draw! categories (https://github.com/googlecreativelab/quickdraw-dataset),
// made available by Google, Inc. under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
// Changed: a few dropped (lines and squiggles, weapons, alcohol), some renamed, and sorted by difficulty.
// The themed packs in words.ts are mixed in as medium words.

export type Level = "easy" | "medium" | "hard";

export const DRAW_WORDS: Record<Level, string[]> = {
  easy: [
    "Ant", "Apple", "Axe", "Banana", "Baseball", "Basketball", "Beard", "Bed",
    "Bee", "Bird", "Book", "Bread", "Bucket", "Bus", "Butterfly", "Cake",
    "Candle", "Car", "Carrot", "Cat", "Chair", "Circle", "Clock", "Cloud",
    "Cookie", "Crown", "Cup", "Diamond", "Dog", "Donut", "Door", "Ear",
    "Envelope", "Eye", "Eyeglasses", "Face", "Fish", "Flower", "Foot", "Fork",
    "Grapes", "Hammer", "Hand", "Hat", "Hexagon", "House", "Ice cream", "Key",
    "Knife", "Ladder", "Leaf", "Light bulb", "Lightning", "Lollipop", "Moon", "Mountain",
    "Moustache", "Mouth", "Mug", "Mushroom", "Nail", "Nose", "Octagon", "Pants",
    "Pear", "Pencil", "Pizza", "Rain", "Rainbow", "Sailboat", "Scissors", "Shoe",
    "Shorts", "Smiley face", "Snail", "Snake", "Snowflake", "Snowman", "Soccer ball", "Sock",
    "Spider", "Spoon", "Square", "Stairs", "Star", "Sun", "Sword", "Table",
    "Tent", "Tooth", "Train", "Tree", "Triangle", "Truck", "T-shirt", "Umbrella",
    "Wheel",
  ],
  medium: [
    "Airplane", "Alarm clock", "Ambulance", "Arm", "Backpack", "Barn", "Baseball bat", "Basket",
    "Bat", "Bathtub", "Beach", "Bear", "Belt", "Bench", "Bicycle", "Birthday cake",
    "Blueberry", "Bridge", "Broccoli", "Broom", "Bush", "Cactus", "Camel", "Campfire",
    "Canoe", "Castle", "Church", "Coffee cup", "Couch", "Cow", "Crab", "Crocodile",
    "Dolphin", "Drums", "Duck", "Elephant", "Fan", "Fence", "Finger", "Fire truck",
    "Flamingo", "Flashlight", "Frog", "Frying pan", "Garden", "Giraffe", "Golf club", "Grass",
    "Guitar", "Hamburger", "Helicopter", "Helmet", "Hockey stick", "Horse", "Hospital", "Hot air balloon",
    "Hot dog", "Jacket", "Jail", "Kangaroo", "Leg", "Lighthouse", "Lion", "Mailbox",
    "Monkey", "Motorbike", "Mouse", "Ocean", "Octopus", "Onion", "Oven", "Owl",
    "Palm tree", "Panda", "Parachute", "Parrot", "Peas", "Penguin", "Piano", "Pickup truck",
    "Pig", "Pillow", "Pineapple", "Police car", "Pond", "Pool", "Popsicle", "Potato",
    "Rabbit", "Rake", "River", "Sandwich", "Saw", "School bus", "Seesaw", "Shark",
    "Sheep", "Shovel", "Sink", "Skateboard", "Skull", "Speedboat", "Squirrel", "Steak",
    "Stop sign", "Strawberry", "Suitcase", "Swan", "Sweater", "Teapot", "Teddy bear", "Tennis racquet",
    "Tiger", "Toe", "Toilet", "Toothbrush", "Tractor", "Traffic light", "Trumpet", "Underwear",
    "Van", "Vase", "Violin", "Watermelon", "Whale", "Zebra",
  ],
  hard: [
    "Aircraft carrier", "Angel", "Animal migration", "Anvil", "Asparagus", "Bandage", "Binoculars", "Blackberry",
    "Boomerang", "Bottlecap", "Bowtie", "Bracelet", "Brain", "Bulldozer", "Calculator", "Calendar",
    "Camera", "Cannon", "Ceiling fan", "Cello", "Phone", "Chandelier", "Clarinet", "Compass",
    "Computer", "Cooler", "Crayon", "Cruise ship", "Dishwasher", "Diving board", "Dragon", "Dresser",
    "Drill", "Dumbbell", "Elbow", "Eraser", "Feather", "Fire hydrant", "Fireplace", "Flip flops",
    "Floor lamp", "Flying saucer", "Garden hose", "Goatee", "Harp", "Headphones", "Hedgehog", "Hockey puck",
    "Hot tub", "Hourglass", "House plant", "Hurricane", "Keyboard", "Knee", "Lantern", "Laptop",
    "Lipstick", "Lobster", "Map", "Marker", "Matches", "Megaphone", "Mermaid", "Microphone",
    "Microwave", "Mosquito", "Necklace", "Paintbrush", "Paint can", "Paper clip", "Passport", "Peanut",
    "Picture frame", "Pliers", "Postcard", "Power outlet", "Purse", "Raccoon", "Radio", "Remote control",
    "Rhinoceros", "Roller coaster", "Rollerskates", "Saxophone", "Scorpion", "Screwdriver", "Sea turtle", "Skyscraper",
    "Sleeping bag", "Snorkel", "Spreadsheet", "Stereo", "Stethoscope", "Stitches", "Stove", "Streetlight",
    "String bean", "Submarine", "Swing set", "Telephone", "Television", "Eiffel Tower", "Great Wall of China", "Mona Lisa",
    "Toaster", "Toothpaste", "Tornado", "Trombone", "Washing machine", "Waterslide", "Windmill", "Wristwatch",
    "Yoga",
  ],
};
