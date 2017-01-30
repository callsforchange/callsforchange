# 52calls-52weeks
A simple project to manage a reminder system to call your local representative

## SASS
We're using [SASS](http://sass-lang.com/) to compile and generate the `style.css` file.

### Installation
`gem install sass`

### Development
In the root directory of the repo, run this command:
`sass --watch scss/style.scss:static/style.css`



### Regenerating the representatives table
Grab the data from [here](https://www.senate.gov/general/contact_information/senators_cfm.xml) and
send it through [this online tool](http://xmlgrid.net/xml2text.html) to get the list of members in a
CSV format.  Then, clean the data in VI or some other text editor tool, to remove spurious newlines
```
sed s/\n  *//g
```
and rogue commas (found in some names):
```
%s/("([^,]*),([^,]*)"/\1 \2/g
```
and of course check the data to make sure it looks legit.  Then manually deploy and invoke the `rehydrate` command.
