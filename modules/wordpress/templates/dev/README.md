# Pulse.digital - <%- projectName %>

Installation de base de développement de technology Wordpress.

* Initié par @<%- note.author.username %>
* Technologie: **Wordpress**
* Projet Git: <%- project.http_url_to_repo %>
* Intégré le <%- new Date().toLocaleString() %>

## Environnement de développement

Domaine: https://<%- brain.env.dev.deploy_domain %>

Le mot de passe administrateur de Wordpress est **<%- brain.env.dev.admin_password %>**

* Interface d'administration:
  * User: **admin**
  * Password: **<%- brain.env.dev.admin_password %>**
* Base de données:
  * Database: **<%- brain.env.dev.db_user %>**
  * User: **<%- brain.env.dev.db_user %>**
  * Password: **<%- brain.env.dev.db_password %>**

Vous pouvez vous connecter sur https://dev.mysql.pulse.digital pour administrer
la base de données.

## Environnement de production

Domaine: https://<%- brain.env.prod.deploy_domain %>

Le mot de passe administrateur de Wordpress est **<%- brain.env.prod.admin_password %>**

* Interface d'administration:
  * User: **admin**
  * Password: **<%- brain.env.prod.admin_password %>**
* Base de données:
  * Database: **<%- brain.env.prod.db_user %>**
  * User: **<%- brain.env.prod.db_user %>**
  * Password: **<%- brain.env.prod.db_password %>**

Si le site de production est hébergé chez Pulse.digital alors vous pouvez vous
connecter sur https://prod.mysql.pulse.digital pour administrer la base de données.

## Mise à jour

Le composant de développement Wordpress et tout ses plugins doivent être mis à jour depuis le Git.
La mise à jour automatique est simplement désactivé dans la configuration

## Modèle de développement

Ce projet a été configuré de facon a pouvoir gérer de multiples environnements. Ainsi il existe 2 environnements

* **dev**: Qui correspond à la branche principale de développe et qui est associée à la branche Git **develop**
* **prod**: Qui correspond à la branche de déploiement en production et qui est associée à la branche Git **master**

En principe il ne faut pas commiter directement l'une ou l'autre branche mais passer par des Merges Requests (MR).
L’intérêt de la MR est de regrouper du code, une issue, des commits et de mettre en place un mécanisme de review.

Cet intégration n'est pour le moment pas obligatoire chez Pulse.digital pour le moment, mais le deviendra un jour.


## Comment entrer le processus

* Aller dans l'issue que vous devez développer
* Cliquez sur "Create merge request"
* A partir de ce moment une branche a été créer pour les développements de l'issue
* Vous pouvez cloner le répertoire et pointer sur votre branche
* Dans la Merge Request on peut constater le terme **WIP** qui veut dire que le travail est en cours
* Lorsque vous avez fini de travailler vous pouvez enlever le terme **WIP** pour indiquer que le travail est fini
* A ce moment vous devez appeler votre supérieur pour qu'il **review** le travail: par exemple @mykiimike please review
* Une fois que la review est réalisée le code peut être fusionner avec la branche **develop** (qui va lancer le CICD)
* Plus tard on pourra fusionner **develop** avec **master**

Comme indiqué **cette méthodologie n'est pour le moment pas obligatoire**, elle n'est décrite ici que pour
commencer à y penser.

## En cas de modification

Si vous modifiez les données d'authentification du projet (db ou admin) alors il faut les modifier aussi dans ce README.

## Ne pas oublier

Merci de ne pas oublier de saisir vos timesheets avec **/spend**!
