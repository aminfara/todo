import awsLambdaFastify from "@fastify/aws-lambda";
import { createServer } from "./server.js";

export const handler = awsLambdaFastify(await createServer());
