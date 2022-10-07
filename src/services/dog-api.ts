import axios from "axios";

interface dogData extends JSON {
  [key: string]: object;
}

export async function isBreed(
  breed: string,
  subBreed?: string,
): Promise<boolean> {
  //hit the endpoint, check if breed exists in db, useful as a search function
  try {
    const response = await axios.get("https://dog.ceo/api/breeds/list/all");
    const allBreeds: dogData = response.data.message;
    const isBreed = subBreed
      ? Object.values(allBreeds[breed]).includes(subBreed)
      : Object.keys(allBreeds).includes(breed);
    return isBreed;
  } catch (err) {
    throw err;
  }
}

export async function getRandomDog() {
  try {
    const response = await axios.get("https://dog.ceo/api/breeds/image/random");
    return response.data;
  } catch (err) {
    throw err;
  }
}

export async function getDogByBreed(breed: string, subBreed?: string | null) {
  //hit the endpoint, check if breed exists in db, useful as a search function
  try {
    const searchQuery = subBreed
      ? "https://dog.ceo/api/breed/" + breed + "/" + subBreed + "/images/random"
      : "https://dog.ceo/api/breed/" + breed + "/images/random";

    const response = await axios.get(searchQuery);
    return response.data.message;
  } catch (err) {
    throw err;
  }
}
