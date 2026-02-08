import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cwl from "aws-cdk-lib/aws-logs";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class TodoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define Todo Lambda
    const todoFunction = new lambda.Function(this, "TodoFunction", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      architecture: lambda.Architecture.ARM_64,
      code: new lambda.AssetCode("../service/build/todo.zip"),
      handler: "bootstrap",
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
