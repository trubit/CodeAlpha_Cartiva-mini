terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  # Production remote backend state locking configuration (S3 + DynamoDB)
  # backend "s3" {
  #   bucket         = "cartiva-mini-terraform-state"
  #   key            = "production/infrastructure.tfstate"
  #   region         = "eu-west-1"
  #   dynamodb_table = "cartiva-mini-tf-locks"
  #   encrypt        = true
  # }
}

