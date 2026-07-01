// import jsonData from "@/data.json";

// export interface IData {
//   questions: IDataQuestion[];
// }

// export interface IDataQuestion {
//   id: number;
//   text?: string;
//   image?: string;
//   correctAnswer: string;
//   answers: IDataQuestionAnswer[];
// }

// export interface IDataQuestionAnswer {
//   key: string;
//   image?: string;
//   text?: string;
// }

// const data = Object.assign({}, jsonData) as IData;
// data.questions = data.questions.map((question, index) => {
//   return Object.assign({ id: index + 1 }, question);
// });

// export default data as IData;

import { type Question, rawData } from "@/data";

export const dataParsed = JSON.parse(JSON.stringify(rawData)) as {
  questions: Question[];
};

// function numberToLetter(num: number) {
//   if (num < 1 || num > 26) {
//     throw new Error("Invalid input: Please enter a number between 1 and 26.");
//   }
//   return String.fromCharCode(num + 64); // 65 is the ASCII code for 'A'
// }

dataParsed.questions = dataParsed.questions.map((question, index) => {
  // When the answer keys are ["A", "B", "C"].
  // const correctAnswer = numberToLetter(
  //   Number(question.correctAnswer)
  // ).toLocaleUpperCase();

  // When the answer keys are [1, 2, 3].
  const correctAnswer = String(question.correctAnswer);

  return {
    ...question,
    id: index + 1,
    image:
      question.type === "both" || question.type === "image"
        ? `${index + 1}-image`
        : undefined,
    text:
      question.type === "both" || question.type === "text"
        ? question.text
        : undefined,
    correctAnswer,
    answers: question.answers.map((answer, answerIndex) => {
      // When the answer keys are ["A", "B", "C"].
      // const imageKey = `${index + 1}-${numberToLetter(
      //   answerIndex + 1
      // ).toLocaleLowerCase()}`;

      // When the answer keys are [1, 2, 3].
      const imageKey = `${index + 1}-${answerIndex + 1}`;

      return {
        ...answer,
        image:
          answer.type === "both" || answer.type === "image"
            ? imageKey
            : undefined,
        text:
          answer.type === "both" || answer.type === "text"
            ? answer.text
            : undefined,
      };
    }),
  };
});
console.log("rawData", rawData);
console.log("dataParsed", dataParsed);
