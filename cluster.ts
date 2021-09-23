import * as native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";
import * as tls from "@pulumi/tls";
import { ComponentResourceOptions, Output } from "@pulumi/pulumi";
import { containerservice } from "@pulumi/azure-native/types/enums";

interface KubernetesClusterArgs {
  resourceGroupName: Output<string>;
  aDApplicationId: Output<string>;
  aDApplicationSecret: Output<string>;
  aDAdminGroupObjectId: Output<string>;
  subnetId: Output<string>
}

export class KubernetesCluster extends pulumi.ComponentResource {
  public readonly Kubeconfig: Output<string>;
  public readonly Name: Output<string>;
  public readonly ClusterId: Output<string>;
  constructor(name: string, args: KubernetesClusterArgs, opts?: ComponentResourceOptions) {
    super("x:kubernetes:cluster", name, opts);

    const sshPublicKey = new tls.PrivateKey(`${name}-sshKey`, {
      algorithm: "RSA",
      rsaBits: 4096,
    },
      { additionalSecretOutputs: ["publicKeyOpenssh"], parent: this }
    ).publicKeyOpenssh;

    // Must use a shorter name due to https://aka.ms/aks-naming-rules.
    const cluster = new native.containerservice.ManagedCluster(`${name}-aks`, {
      resourceGroupName: args.resourceGroupName,
      servicePrincipalProfile: {
        clientId: args.aDApplicationId,
        secret: args.aDApplicationSecret,
      },
      enableRBAC: true,
      aadProfile: {
        managed: true,
        adminGroupObjectIDs: [args.aDAdminGroupObjectId],
      },
      agentPoolProfiles: [
        {
          count: 2,
          mode: "System",
          name: "agentpool",
          nodeLabels: {},
          osDiskSizeGB: 30,
          osType: "Linux",
          type: "VirtualMachineScaleSets",
          vmSize: "Standard_DS3_v2",
          vnetSubnetID: args.subnetId,
        },
      ],
      dnsPrefix: `${name}`,
      linuxProfile: {
        adminUsername: "adminpulumi",
        ssh: {
          publicKeys: [
            {
              keyData: sshPublicKey,
            },
          ],
        },
      },
      kubernetesVersion: "1.21.2",
      nodeResourceGroup: `${name}-aks-nodes-rg`,
      networkProfile: {
        networkPlugin: containerservice.NetworkPlugin.Azure,
        networkPolicy: containerservice.NetworkPolicy.Azure
      }
    }, { parent: this, protect: false });

    const credentials = pulumi
      .all([cluster.name, args.resourceGroupName])
      .apply(([clusterName, resourceGroupName]) => {
        return native.containerservice.listManagedClusterAdminCredentials(
          {
            resourceGroupName: resourceGroupName,
            resourceName: clusterName,
          }
        );
      });

    this.Name = cluster.name;
    this.Kubeconfig = credentials.kubeconfigs[0].value.apply((config) =>
      Buffer.from(config, "base64").toString()
    );
    this.ClusterId = cluster.id;
    this.registerOutputs({
      Name: this.Name,
      Kubeconfig: this.Kubeconfig,
      ClusterId: this.ClusterId
    });
  }
}
