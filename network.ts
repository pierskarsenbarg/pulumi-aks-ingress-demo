import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import { Output } from "@pulumi/pulumi";

export interface NetworkArgs {
  resourceGroupName: Output<string>,
  networkCidr: string,
  subnetCidr: string,
};

export class Network extends pulumi.ComponentResource {
  public readonly subnetId: Output<string>;
  public readonly vNetName: Output<string>;
  constructor(name: string, args: NetworkArgs) {
    super("x:infrastructure:networking", name);

    const vnet = new azure.network.VirtualNetwork(`${name}-vnet`, {
      resourceGroupName: args.resourceGroupName,
      addressSpace: {
        addressPrefixes: [args.networkCidr],
      },
    }, { parent: this, ignoreChanges: ["subnets", "etags"] }); // ignore changes due to https://github.com/pulumi/pulumi-azure-native/issues/611#issuecomment-721490800

    const subnet = new azure.network.Subnet(`${name}-snet`, {
      resourceGroupName: args.resourceGroupName,
      virtualNetworkName: vnet.name,
      addressPrefix: args.subnetCidr,
      serviceEndpoints: [{
        service: "Microsoft.Sql"
      }],
    }, { parent: vnet });

    this.subnetId = subnet.id;
    this.vNetName = vnet.name;
    this.registerOutputs({
      subnetId: this.subnetId,
      vnetName: this.vNetName,
    });
  }
}
