import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as cwl from "aws-cdk-lib/aws-logs";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// absolute path to the service directory, which is the parent of this infra directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceDir = path.join(__dirname, "../../service");

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Main Lambda function
    const todoFunction = new NodejsFunction(this, "TodoFunction", {
      entry: path.join(serviceDir, "src/lambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      projectRoot: serviceDir,
      depsLockFilePath: path.join(serviceDir, "package-lock.json"),
      bundling: {
        mainFields: ["module", "main"],
        format: OutputFormat.ESM,
        bundleAwsSDK: true,
        sourceMap: true,
        // CJS packages (e.g. @fastify/aws-lambda) use require() for built-in Node modules.
        // This banner injects a proper createRequire shim so those calls work in ESM output.
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        NODE_ENV: "production",
        TODOS_LOG_LEVEL: "debug",
      },
      logGroup: new cwl.LogGroup(this, "TodoFunctionLogGroup", {
        logGroupName: "/aws/lambda/TodoFunction",
        retention: cwl.RetentionDays.ONE_WEEK,
      }),
    });

    // API Gateway
    const api = new apig.RestApi(this, "TodoApi", {
      restApiName: "Todo API",
      description: "This is the Todo API.",
    });

    // Add Lambda integration to root and all paths
    api.root.addMethod("ANY", new apig.LambdaIntegration(todoFunction)); // This is required for the root path
    api.root.addProxy({
      defaultIntegration: new apig.LambdaIntegration(todoFunction),
      anyMethod: true,
    });
  }
}
