// Draw it words: everyday things that are fun to draw, by how hard they are.
// From Google's Quick, Draw! categories (https://github.com/googlecreativelab/quickdraw-dataset),
// made available by Google, Inc. under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
// Changed: a few dropped (lines and squiggles, weapons, alcohol), some renamed, and sorted by difficulty.
// Added: extra hard words (office moments, idioms, silly scenes, fun things, animals, food, landmarks)
// written for this game; they are not from Quick, Draw!.
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

    // Office life: the funny moments everyone recognises
    "You're on mute", "Cat on the keyboard", "Dog on a video call", "Spilled coffee", "Printer jam", "Frozen screen", "Reply all", "Asleep at the desk",
    "Monday morning", "Stuck in the elevator", "Water cooler chat", "Paper airplane", "Office chair race", "Surprise party", "Pizza Friday", "Tangled cables",
    "Sticky notes everywhere", "Coffee queue", "Fire drill", "Rush hour", "Out of office", "Vending machine", "Ping pong table", "Org chart",
    "Pie chart", "Handshake", "Deadline", "Trophy",

    // Work idioms: every one has a picture hiding in it
    "Elephant in the room", "Herding cats", "Putting out fires", "Low-hanging fruit", "Deep dive", "Bottleneck", "Ice breaker", "Elevator pitch",
    "Ducks in a row", "Back to the drawing board", "Red tape", "Snowball effect", "Moonshot", "Cash cow", "Tip of the iceberg", "Brainstorm",
    "Burning the midnight oil", "Rocket science",

    // Everyday sayings
    "Raining cats and dogs", "When pigs fly", "Cat out of the bag", "Fish out of water", "Spill the beans", "Piece of cake", "Couch potato", "Night owl",
    "Early bird", "Cold feet", "Hold your horses", "Wild goose chase", "Under the weather", "Pie in the sky",

    // Silly moments
    "Brain freeze", "Bad hair day", "Sunburn", "Sneeze", "Hiccups", "Photobomb", "Selfie", "Sleepwalking",
    "Slipping on a banana", "Belly flop", "Pillow fight", "Snowball fight", "Food fight", "Tug of war", "Piggyback ride", "Conga line",
    "Limbo", "Karaoke", "Bubble bath", "Snow angel", "Melting snowman", "Juggling", "Magic trick", "Domino effect",
    "Bungee jump", "Skydiving", "Tightrope walker", "One-man band",

    // Fun things and places
    "Haunted house", "Ghost", "Pirate ship", "Treasure map", "Desert island", "Message in a bottle", "Erupting volcano", "Time machine",
    "Alien", "Robot", "Rocket", "Astronaut", "Superhero", "Scarecrow", "Sock puppet", "Rubber duck",
    "Whoopee cushion", "Lemonade stand", "Sandcastle", "Treehouse", "Ferris wheel", "Carousel", "Trampoline", "Hammock",
    "Igloo", "Snow globe", "Jack-in-the-box", "Piggy bank", "Treasure chest", "Magnifying glass", "Telescope", "Typewriter",
    "Wheelbarrow", "Shopping cart", "Escalator", "Drone",

    // Animals with personality
    "Sloth", "Platypus", "Narwhal", "Peacock", "Chameleon", "Jellyfish", "Pufferfish", "Hermit crab",
    "Seahorse", "Llama", "Koala", "Porcupine", "Walrus", "Ostrich", "Woodpecker", "Unicorn",
    "Dinosaur", "Ladybug",

    // Food
    "Melting ice cream", "Burnt toast", "Pancake stack", "Spaghetti", "Sushi", "Fortune cookie", "Gingerbread house", "Candy cane",
    "Corn on the cob", "Fried egg", "Pretzel", "Taco",

    // Landmarks
    "Statue of Liberty", "Leaning Tower of Pisa", "Pyramids", "Stonehenge", "Big Ben", "Taj Mahal", "Sphinx",
  ],
};
