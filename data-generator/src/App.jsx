import { useState, useEffect } from "react";
import Papa from "papaparse";
import seedrandom from "seedrandom";
import { Faker, en, de, pl } from "@faker-js/faker";

const fakerEN_US = new Faker({ locale: [en] });
const fakerDE = new Faker({ locale: [de, en] });
const fakerPL = new Faker({ locale: [pl, en] });

function App() {
  const [region, setRegion] = useState("USA");
  const [errorsPerRecord, setErrorsPerRecord] = useState(0);
  const [seed, setSeed] = useState(42);
  const [data, setData] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  const recordsPerPage = pageNumber === 1 ? 20 : 10;

  const getLocale = (region) => {
    switch (region) {
      case "Germany":
        return fakerDE;
      case "Poland":
        return fakerPL;
      case "USA":
      default:
        return fakerEN_US;
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const generateRecord = (index, region, errorsPerRecord, seed) => {
    const faker = getLocale(region);
    const combinedSeed = `${seed}-${index}`;
    const seedValue = seedrandom(combinedSeed).int32();
    faker.seed(seedValue);
    const rng = seedrandom(combinedSeed);
    const identifier = faker.string.uuid();
    const name = `${faker.person.firstName()} ${faker.person.middleName()} ${faker.person.lastName()}`;
    const address = generateAddress(region, faker);
    const phone = generatePhone(region, faker);

    const record = {
      index,
      identifier,
      name,
      address,
      phone,
    };
    const errorsToApply = Math.floor(errorsPerRecord);
    const fractionalError = errorsPerRecord - errorsToApply;
    let totalErrors = errorsToApply;

    if (fractionalError > rng()) {
      totalErrors += 1;
    }

    for (let e = 0; e < totalErrors; e++) {
      applyRandomError(record, rng, region);
    }

    return record;
  };

  const applyRandomError = (record, rng, region) => {
    const fields = ["name", "address", "phone"];
    const fieldIndex = Math.floor(rng() * fields.length);
    const field = fields[fieldIndex];
    record[field] = introduceError(record[field], rng, region);
  };

  const introduceError = (text, rng, region) => {
    if (text.length === 0) return text;

    const errorTypes = ["delete", "insert", "swap"];
    const errorTypeIndex = Math.floor(rng() * errorTypes.length);
    const errorType = errorTypes[errorTypeIndex];
    const position = Math.floor(rng() * text.length);

    const alphabet = getAlphabet(region);
    const charIndex = Math.floor(rng() * alphabet.length);
    const randomChar = alphabet[charIndex];

    switch (errorType) {
      case "delete":
        return text.slice(0, position) + text.slice(position + 1);
      case "insert":
        return text.slice(0, position) + randomChar + text.slice(position);
      case "swap":
        if (position < text.length - 1) {
          const chars = text.split("");
          [chars[position], chars[position + 1]] = [
            chars[position + 1],
            chars[position],
          ];
          return chars.join("");
        }
        return text;
      default:
        return text;
    }
  };

  const getAlphabet = (region) => {
    switch (region) {
      case "Germany":
        return "abcdefghijklmnopqrstuvwxyzäöüß";
      case "Poland":
        return "aąbcćdeęfghijklłmnńoópqrsśtuvwxyzźż";
      case "USA":
      default:
        return "abcdefghijklmnopqrstuvwxyz";
    }
  };

  const generateAddress = (region, faker) => {
    switch (region) {
      case "Germany":
        return `${faker.location.streetAddress()} ${faker.location.city()} ${faker.location.state()}`;
      case "Poland":
        return `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`;
      case "USA":
      default:
        return `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`;
    }
  };

  const generatePhone = (region, faker) => {
    switch (region) {
      case "Germany":
        return `+49-${faker.string.numeric(3)}-${faker.string.numeric(
          3
        )}-${faker.string.numeric(4)}`;
      case "Poland":
        return `+48-${faker.string.numeric(3)}-${faker.string.numeric(
          3
        )}-${faker.string.numeric(4)}`;
      case "USA":
      default:
        return `(+1) ${faker.string.numeric(3)}-${faker.string.numeric(
          3
        )}-${faker.string.numeric(4)}`;
    }
  };

  useEffect(() => {
    const fetchData = () => {
      setIsFetching(true);
      const totalRecordsBefore =
        pageNumber === 1 ? 0 : 20 + (pageNumber - 2) * 10;
      const newData = [];

      for (let i = 0; i < recordsPerPage; i++) {
        const index = totalRecordsBefore + i + 1;
        try {
          const record = generateRecord(
            index,
            region,
            parseFloat(errorsPerRecord),
            seed
          );
          newData.push(record);
        } catch (error) {
          console.error(`Error generating record ${index}:`, error);
        }
      }

      if (pageNumber === 1) {
        setData(newData);
      } else {
        setData((prevData) => [...prevData, ...newData]);
      }

      setIsFetching(false);
    };

    fetchData();
  }, [
    pageNumber,
    region,
    errorsPerRecord,
    seed,
    generateRecord,
    recordsPerPage,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 100 &&
        !isFetching
      ) {
        setPageNumber((prevPageNumber) => prevPageNumber + 1);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isFetching]);

  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000000);
    setSeed(randomSeed);
  };

  const exportToCSV = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "data.csv");
    link.click();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Fake User Data Generator
      </h1>
      <div className="mb-4">
        <label className="block text-lg font-medium mb-2">Region:</label>
        <select
          className="w-full p-2 border border-gray-300 rounded"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="USA">USA</option>
          <option value="Germany">Germany</option>
          <option value="Poland">Poland</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-lg font-medium mb-2">
          Errors per Record:
        </label>
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={errorsPerRecord}
          onChange={(e) => setErrorsPerRecord(parseFloat(e.target.value))}
          className="input-range"
        />
        <input
          type="number"
          min="0"
          max="1000"
          step="1"
          value={errorsPerRecord}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            if (value > 1000) {
              setErrorsPerRecord(1000);
            } else {
              setErrorsPerRecord(value);
            }
          }}
        />
      </div>
      <div className="mb-4">
        <label className="block text-lg font-medium mb-2">Seed:</label>
        <input
          type="number"
          className="w-full p-2 border border-gray-300 rounded"
          value={seed}
          onChange={(e) => setSeed(parseInt(e.target.value, 10))}
        />
        <button
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={generateRandomSeed}
        >
          Generate Random Seed
        </button>
      </div>
      <div className="text-center mt-6">
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={exportToCSV}
        >
          Export to CSV
        </button>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Generated Data</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Index</th>
                <th>Identifier</th>
                <th>Name</th>
                <th>Address</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {data.map((record) => (
                <tr key={record.identifier}>
                  <td>{record.index}</td>
                  <td>{record.identifier}</td>
                  <td>{record.name}</td>
                  <td>{record.address}</td>
                  <td>{record.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isFetching && (
          <div className="mt-4 text-center">
            <p>Loading more records...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
