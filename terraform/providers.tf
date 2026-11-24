provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Kubernetes provider pointing to generated cluster outputs
provider "kubernetes" {
  host                   = aws_eks_cluster.cartiva.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.cartiva.certificate_authority[0].data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    args        = ["eks", "get-token", "--cluster-name", aws_eks_cluster.cartiva.name]
    command     = "aws"
  }
}
