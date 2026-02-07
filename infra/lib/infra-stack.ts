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
  }
}
